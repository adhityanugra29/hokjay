import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { Invoice } from "@/models/Invoice";
import { nextInvoiceNumber } from "@/lib/counters";
import { computeLineCommission, maxDiskonBekas, maxDiskonBaru, resolveKomisiBekasPercent } from "@/lib/commission";
import { formatDimensi } from "@/lib/format";
import { getKategoriKomisiBekasMap } from "@/lib/katalog";

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
  const [products, kategoriKomisiBekasMap] = await Promise.all([
    Product.find({ _id: { $in: productIds } }),
    getKategoriKomisiBekasMap(),
  ]);
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const finalize = input.status !== "draft";

  const items = input.items.map((i) => {
    const rawDiskon = i.diskonPerUnit ?? 0;

    if (!i.productId) {
      // Custom-order item: no product reference/stock, but still earns the
      // flat 6% "barang baru/custom" commission rate on its sale price —
      // after diskon, per the user's request 2026-08-29 (a discount now
      // proportionally reduces commission instead of the sales rep
      // keeping full commission on a discounted sale). Clamped the same
      // way as a regular barang baru line — maxDiskonBaru(hargaJual, 0)
      // degrades to hargaJual itself here since there's no real Harga
      // Bottom for a bespoke item — closes BUG-004, this had no ceiling
      // at all before.
      const diskon = i.isFlashSale ? rawDiskon : Math.min(rawDiskon, maxDiskonBaru(i.hargaJual, 0));
      const subtotal = (i.hargaJual - diskon) * i.qty;
      const komisiPerItem = computeLineCommission({ isCustom: true, hargaJual: i.hargaJual, hargaMinimum: 0, diskon });
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
    // Harga Jual can't go below Harga Minimum — server-side enforcement of
    // the same floor the client already clamps to on blur (ProductCard.tsx/
    // ItemRowEditor.tsx), so a raw API request can't bypass it. Per the
    // user's report 2026-08-30 ("kenapa masih bisa untuk masukan harga
    // dibawah harga minimum?"). Silently clamped (not rejected), same
    // treatment as the diskon cap below. N/A for Flash Sale items — their
    // hargaJual IS the locked flash price, which can legitimately sit
    // below the product's normal hargaMinimum.
    const hargaJual =
      !i.isFlashSale && i.hargaJual > 0 && i.hargaJual < product.hargaMinimum
        ? product.hargaMinimum
        : i.hargaJual;
    // Diskon can't exceed maxDiskonBekas for barang bekas (or maxDiskonBaru
    // for barang baru — closes BUG-004, found while designing TASK-003:
    // this side had NO server-side ceiling at all before, only bekas did)
    // — server-side enforcement of the same caps the client already clamps
    // to on blur (ProductCard.tsx/ItemRowEditor.tsx), so a raw API request
    // can't bypass either. Per the user's request 2026-08-29 ("besaran
    // diskon ... tidak boleh lebih dari total insentif yang diberikan").
    // Silently clamped (not rejected). N/A when this line is a Flash Sale
    // item — Diskon is locked at 0 for those regardless.
    // Owner-only override chain (2026-09-03): the product's own rate wins,
    // then its category's default, then the original global 10% — see
    // resolveKomisiBekasPercent(). Resolved server-side from the DB, never
    // trusted from the client, same as everything else in this function.
    const komisiBekasPercent = resolveKomisiBekasPercent(
      product.komisiBekasPercent,
      kategoriKomisiBekasMap.get(product.category)
    );
    const diskon = i.isFlashSale
      ? rawDiskon
      : product.kondisi === "bekas"
        ? Math.min(rawDiskon, maxDiskonBekas(hargaJual, product.hargaMinimum, komisiBekasPercent))
        : Math.min(rawDiskon, maxDiskonBaru(hargaJual, product.hargaMinimum));
    const subtotal = (hargaJual - diskon) * i.qty;
    // Commission is computed from the product's *current* kondisi/harga
    // minimum (never trusting client-supplied values for this) — see
    // lib/commission.ts for the baru/custom vs bekas formula, which now
    // handles the diskon subtraction internally (including flooring at 0
    // for barang bekas) — per the user's request 2026-08-29. Flash Sale
    // items get their own flat 7% instead, bypassing kondisi/hargaMinimum
    // entirely — reverted the same day from an earlier attempt at
    // treating the Flash Sale price as a "new Harga Minimum" fed into
    // this same formula.
    const komisiPerItem = computeLineCommission({
      kondisi: product.kondisi as "baru" | "bekas",
      hargaJual,
      hargaMinimum: product.hargaMinimum,
      diskon,
      isFlashSale: i.isFlashSale,
      komisiBekasPercent,
    });
    return {
      product: product._id,
      isCustom: false,
      namaSnapshot: product.name,
      dimensiSnapshot: formatDimensi(product.dimensi),
      qty: i.qty,
      hargaJual,
      hargaMinimumSnapshot: product.hargaMinimum,
      hargaRekomendasiSnapshot: product.hargaRekomendasi,
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
