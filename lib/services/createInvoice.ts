import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { Invoice } from "@/models/Invoice";
import { nextInvoiceNumber } from "@/lib/counters";
import { computeLineCommission, maxDiskonBekas } from "@/lib/commission";
import { formatDimensi } from "@/lib/format";

export interface CreateInvoiceItemInput {
  /** Absent for custom-order line items, which have no backing Product. */
  productId?: string;
  /** Required when productId is absent — the custom item's description. */
  namaSnapshot?: string;
  qty: number;
  hargaJual: number;
  diskonPerUnit?: number;
  /** Snapshotted client-side at add-to-cart time — see ProductCard.tsx/AddProductSidebar.tsx. Per the user's request 2026-08-29. */
  isFlashSale?: boolean;
}

export interface CreateInvoiceInput {
  customerId?: string;
  customerNama: string;
  customerWhatsapp?: string;
  shipAddress?: string;
  salesId?: string;
  salesNama: string;
  tanggalInvoice?: Date | string;
  tanggalKirim?: Date | string;
  kurir?: string;
  ongkosKirim?: number;
  items: CreateInvoiceItemInput[];
  status: "draft" | "unpaid";
}

/**
 * Creates an invoice. Sending it ("unpaid", not draft) does NOT touch stock
 * or accounting anymore — per the user's request 2026-08-27, an unpaid
 * invoice is just a "Booked" reservation (or "Sudah DP" once a down
 * payment lands, see receiveDp.ts), visible in Katalog but not yet
 * physically deducted. Stock, revenue, HPP, and commission are all only
 * ever recognized together at actual payment confirmation (see
 * payInvoice.ts's postInvoiceLunas). This function still validates
 * available stock isn't obviously oversold at booking time (a soft check —
 * the authoritative one runs at payInvoice time, since stock isn't
 * reserved between booking and payment) and still snapshots each item's
 * commission rate and cost basis (hargaBeliSnapshot) using the product's
 * CURRENT kondisi/harga at booking time, so a later price change never
 * retroactively changes what was already agreed with this customer.
 * Custom-order items (no productId) never touch stock but do earn the flat
 * 6% "barang baru" commission rate.
 */
export async function createInvoice(input: CreateInvoiceInput) {
  await dbConnect();

  if (input.items.length === 0) {
    throw new Error("Invoice harus punya minimal 1 item produk");
  }

  const productIds = input.items.filter((i) => i.productId).map((i) => i.productId!);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const finalize = input.status !== "draft";

  const items = input.items.map((i) => {
    const rawDiskon = i.diskonPerUnit ?? 0;

    if (!i.productId) {
      // Custom-order item: no product reference/stock, but still earns the
      // flat 6% "barang baru/custom" commission rate on its sale price —
      // after diskon, per the user's request 2026-08-29 (a discount now
      // proportionally reduces commission instead of the sales rep
      // keeping full commission on a discounted sale). No diskon cap here
      // — that only applies to barang bekas (see below), and a custom
      // item has no kondisi/Harga Minimum to anchor one against.
      const diskon = rawDiskon;
      const subtotal = (i.hargaJual - diskon) * i.qty;
      const komisiPerItem = computeLineCommission({ isCustom: true, hargaJual: i.hargaJual - diskon, hargaMinimum: 0 });
      return {
        product: undefined,
        isCustom: true,
        namaSnapshot: i.namaSnapshot || "Item Custom",
        qty: i.qty,
        hargaJual: i.hargaJual,
        hargaMinimumSnapshot: 0,
        diskonPerUnit: diskon,
        isFlashSale: i.isFlashSale ?? false,
        subtotal,
        komisiPerItemSnapshot: komisiPerItem,
        komisiSubtotal: komisiPerItem * i.qty,
      };
    }

    const product = productMap.get(i.productId);
    if (!product) throw new Error(`Produk ${i.productId} tidak ditemukan`);
    // Soft check only — stock isn't actually reserved by a Booked/DP'd
    // invoice anymore (see the function doc comment above), so this just
    // catches an obviously-impossible booking. The authoritative check
    // that actually blocks overselling runs at payInvoice time, since
    // several bookings can now compete for the same physical stock.
    if (finalize && product.stok < i.qty) {
      throw new Error(`Stok ${product.name} tidak cukup (sisa ${product.stok})`);
    }
    // Diskon can't exceed maxDiskonBekas for barang bekas — server-side
    // enforcement of the same cap the client already clamps to on blur
    // (ProductCard.tsx/ItemRowEditor.tsx), so a raw API request can't
    // bypass it. Per the user's request 2026-08-29 ("besaran diskon ...
    // tidak boleh lebih dari total insentif yang diberikan"). Silently
    // clamped (not rejected), matching how the below-minimum price guard
    // behaves elsewhere in this app.
    const diskon =
      product.kondisi === "bekas" ? Math.min(rawDiskon, maxDiskonBekas(i.hargaJual, product.hargaMinimum)) : rawDiskon;
    const subtotal = (i.hargaJual - diskon) * i.qty;
    // Commission is computed from the product's *current* kondisi/harga
    // minimum (never trusting client-supplied values for this) — see
    // lib/commission.ts for the baru/custom vs bekas formula. Uses the
    // post-diskon price, not the raw hargaJual, so a discount
    // proportionally reduces commission too — per the user's request
    // 2026-08-29.
    const komisiPerItem = computeLineCommission({
      kondisi: product.kondisi as "baru" | "bekas",
      hargaJual: i.hargaJual - diskon,
      hargaMinimum: product.hargaMinimum,
    });
    return {
      product: product._id,
      isCustom: false,
      namaSnapshot: product.name,
      dimensiSnapshot: formatDimensi(product.dimensi),
      qty: i.qty,
      hargaJual: i.hargaJual,
      hargaMinimumSnapshot: product.hargaMinimum,
      // Cost basis at booking time — payInvoice.ts sums these for the HPP
      // journal entry at actual payment time, rather than re-reading
      // whatever the product's harga beli has drifted to by then.
      hargaBeliSnapshot: product.hargaBeli,
      diskonPerUnit: diskon,
      isFlashSale: i.isFlashSale ?? false,
      subtotal,
      komisiPerItemSnapshot: komisiPerItem,
      komisiSubtotal: komisiPerItem * i.qty,
    };
  });

  const subtotalProduk = items.reduce((sum, i) => sum + i.subtotal, 0);
  const ongkosKirim = input.ongkosKirim ?? 0;
  const grandTotal = subtotalProduk + ongkosKirim;

  const nomor = await nextInvoiceNumber();

  const invoice = await Invoice.create({
    nomor,
    customer: {
      ref: input.customerId || undefined,
      nama: input.customerNama,
      whatsapp: input.customerWhatsapp,
    },
    shipAddress: input.shipAddress,
    sales: { ref: input.salesId || undefined, nama: input.salesNama },
    // Undefined falls back to the schema's Date.now default — lets the
    // create form pre-fill today's date but still allows backdating.
    tanggalInvoice: input.tanggalInvoice ? new Date(input.tanggalInvoice) : undefined,
    tanggalKirim: input.tanggalKirim,
    kurir: input.kurir,
    ongkosKirim,
    items,
    subtotalProduk,
    grandTotal,
    status: input.status,
    riwayat: [
      {
        tanggal: new Date(),
        keterangan: finalize ? "Invoice dibuat & terkirim ke pelanggan" : "Invoice disimpan sebagai draft",
      },
    ],
  });

  return invoice;
}
