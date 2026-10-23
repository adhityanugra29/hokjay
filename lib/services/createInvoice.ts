import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { Invoice } from "@/models/Invoice";
import { nextInvoiceNumber } from "@/lib/counters";
import { computeLineCommission, maxDiskonBekas, maxDiskonBaru, resolveKomisiBekasPercent } from "@/lib/commission";
import { formatDimensi, productDisplayName } from "@/lib/format";
import { getKategoriKomisiBekasMap } from "@/lib/katalog";
import { buildJasaLine, loadJasaMap } from "@/lib/services/jasaLine";
import { resolveSyaratKetentuanForSave } from "@/lib/services/syaratKetentuan";

export interface CreateInvoiceItemInput {
  /** Absent for custom-order line items, which have no backing Product. */
  productId?: string;
  /** Set for a service-fee (jasa) line instead of productId — see lib/services/jasaLine.ts. */
  jasaId?: string;
  /** Required when productId is absent — the custom item's description. */
  namaSnapshot?: string;
  qty: number;
  hargaJual: number;
  diskonPerUnit?: number;
  /** Snapshotted client-side at add-to-cart time — see ProductCard.tsx/AddProductSidebar.tsx. */
  isFlashSale?: boolean;
}

export interface CreateInvoiceInput {
  customerId?: string;
  customerNama: string;
  customerWhatsapp?: string;
  shipAddress?: string;
  provinsi?: string;
  kota?: string;
  catatan?: string;
  /**
   * This invoice's own Syarat & Ketentuan. undefined = leave as is (update only), null = follow the Admin → Invoice template,
   * string = custom ("" = no S&K). See lib/services/syaratKetentuan.ts.
   */
  syaratKetentuan?: string | null;
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
 * Creates an invoice. Sending it ("unpaid") does NOT touch stock or accounting: an unpaid invoice is a "Booked" reservation
 * ("Sudah DP" once a DP lands, see receiveDp.ts). Stock, revenue, HPP and commission are only recognized at payment
 * (payInvoice.ts postInvoiceLunas). Validates available stock with a soft check (the authoritative one runs at payInvoice, since stock
 * isn't reserved) and snapshots each item's commission rate and cost basis (hargaBeliSnapshot) from the CURRENT product state, so later
 * price changes never rewrite an agreed invoice. Custom-order items (no productId) never touch stock and earn the flat 6% baru rate.
 */
export async function createInvoice(input: CreateInvoiceInput, opts: { isOwner?: boolean } = {}) {
  await dbConnect();
  // Owner-only: resolved by the caller from the SESSION role, never a client field on `input`. See maxDiskonBaru/maxDiskonBekas `unlimited`.
  const unlimited = opts.isOwner ?? false;

  if (input.items.length === 0) {
    throw new Error("Invoice harus punya minimal 1 item produk");
  }

  const productIds = input.items.filter((i) => i.productId).map((i) => i.productId!);
  const jasaIds = input.items.filter((i) => i.jasaId).map((i) => i.jasaId!);
  const [products, kategoriKomisiBekasMap, jasaMap] = await Promise.all([
    Product.find({ _id: { $in: productIds } }),
    getKategoriKomisiBekasMap(),
    loadJasaMap(jasaIds),
  ]);
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const finalize = input.status !== "draft";

  const items = input.items.map((i) => {
    if (i.jasaId) return buildJasaLine({ jasaId: i.jasaId, hargaJual: i.hargaJual }, jasaMap);

    const rawDiskon = i.diskonPerUnit ?? 0;

    if (!i.productId) {
      // Custom-order item: no product/stock; earns the flat 6% on the price after diskon. Diskon is clamped like a baru line
      // (maxDiskonBaru(hargaJual, 0) degrades to hargaJual: a bespoke item has no real Harga Bottom).
      const diskon = i.isFlashSale ? rawDiskon : Math.min(rawDiskon, maxDiskonBaru(i.hargaJual, 0, unlimited));
      const subtotal = (i.hargaJual - diskon) * i.qty;
      const komisiPerItem = computeLineCommission({ isCustom: true, hargaJual: i.hargaJual, hargaMinimum: 0, diskon });
      return {
        product: undefined,
        isCustom: true,
        namaSnapshot: (i.namaSnapshot || "Item Custom").toUpperCase(),
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
    // Soft check only: Booked/DP'd invoices don't reserve stock; the authoritative oversell check runs at payInvoice time.
    if (finalize && product.stok < i.qty) {
      throw new Error(`Stok ${product.name} tidak cukup (sisa ${product.stok})`);
    }
    // Harga Jual can't go below Harga Minimum (server-side twin of the client clamp in ProductCard/ItemRowEditor, so a raw API request
    // can't bypass it); silently clamped. N/A for Flash Sale: its hargaJual is the locked flash price, which may sit below hargaMinimum.
    const hargaJual =
      !i.isFlashSale && i.hargaJual > 0 && i.hargaJual < product.hargaMinimum
        ? product.hargaMinimum
        : i.hargaJual;
    // Diskon is silently clamped to maxDiskonBekas / maxDiskonBaru (server-side twin of the client caps); N/A for Flash Sale (diskon
    // locked at 0). Bekas rate: product override > category default > 10% (resolveKomisiBekasPercent), from the DB, never the client.
    const komisiBekasPercent = resolveKomisiBekasPercent(
      product.komisiBekasPercent,
      kategoriKomisiBekasMap.get(product.category)
    );
    const diskon = i.isFlashSale
      ? rawDiskon
      : product.kondisi === "bekas"
        ? Math.min(rawDiskon, maxDiskonBekas(hargaJual, product.hargaMinimum, komisiBekasPercent, unlimited))
        : Math.min(rawDiskon, maxDiskonBaru(hargaJual, product.hargaMinimum, unlimited));
    const subtotal = (hargaJual - diskon) * i.qty;
    // Commission comes from the product's CURRENT kondisi/hargaMinimum, never client values (formula + diskon handling: lib/commission.ts).
    // Flash Sale items get a flat 7% that bypasses kondisi/hargaMinimum.
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
      namaSnapshot: productDisplayName(product.name, product.merk).toUpperCase(),
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

  const syaratKetentuan = await resolveSyaratKetentuanForSave({
    input: input.syaratKetentuan,
    finalStatus: input.status,
  });

  const nomor = await nextInvoiceNumber();

  const invoice = await Invoice.create({
    nomor,
    customer: {
      ref: input.customerId || undefined,
      nama: input.customerNama,
      whatsapp: input.customerWhatsapp,
    },
    shipAddress: input.shipAddress,
    provinsi: input.provinsi,
    kota: input.kota,
    catatan: input.catatan,
    syaratKetentuan,
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
