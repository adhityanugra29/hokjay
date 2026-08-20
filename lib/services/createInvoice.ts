import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { Invoice } from "@/models/Invoice";
import { StockMovement } from "@/models/StockMovement";
import { nextInvoiceNumber } from "@/lib/counters";
import { computeLineCommission } from "@/lib/commission";
import { postInvoiceFinalized } from "@/lib/services/journal";

export interface CreateInvoiceItemInput {
  /** Absent for custom-order line items, which have no backing Product. */
  productId?: string;
  /** Required when productId is absent — the custom item's description. */
  namaSnapshot?: string;
  qty: number;
  hargaJual: number;
  diskonPerUnit?: number;
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
 * Creates an invoice. When status is "unpaid" (i.e. "Simpan & Kirim
 * Invoice", not a draft), stock is decremented immediately and the
 * per-line commission is snapshotted using the current product's
 * kondisi/harga bottom (see lib/commission.ts) — drafts have no side
 * effects until they're later finalized. Custom-order items (no
 * productId) never touch stock but do earn the flat 6% "barang baru"
 * commission rate.
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
    const diskon = i.diskonPerUnit ?? 0;
    const subtotal = (i.hargaJual - diskon) * i.qty;

    if (!i.productId) {
      // Custom-order item: no product reference/stock, but still earns the
      // flat 6% "barang baru/custom" commission rate on its sale price.
      const komisiPerItem = computeLineCommission({ isCustom: true, hargaJual: i.hargaJual, hargaMinimum: 0 });
      return {
        product: undefined,
        isCustom: true,
        namaSnapshot: i.namaSnapshot || "Item Custom",
        qty: i.qty,
        hargaJual: i.hargaJual,
        hargaMinimumSnapshot: 0,
        diskonPerUnit: diskon,
        subtotal,
        komisiPerItemSnapshot: komisiPerItem,
        komisiSubtotal: komisiPerItem * i.qty,
      };
    }

    const product = productMap.get(i.productId);
    if (!product) throw new Error(`Produk ${i.productId} tidak ditemukan`);
    if (finalize && product.stok < i.qty) {
      throw new Error(`Stok ${product.name} tidak cukup (sisa ${product.stok})`);
    }
    // Commission is computed from the product's *current* kondisi/harga
    // minimum (never trusting client-supplied values for this) — see
    // lib/commission.ts for the baru/custom vs bekas formula.
    const komisiPerItem = computeLineCommission({
      kondisi: product.kondisi as "baru" | "bekas",
      hargaJual: i.hargaJual,
      hargaMinimum: product.hargaMinimum,
    });
    return {
      product: product._id,
      isCustom: false,
      namaSnapshot: product.name,
      qty: i.qty,
      hargaJual: i.hargaJual,
      hargaMinimumSnapshot: product.hargaMinimum,
      diskonPerUnit: diskon,
      subtotal,
      komisiPerItemSnapshot: komisiPerItem,
      komisiSubtotal: komisiPerItem * i.qty,
    };
  });

  // Cost of goods sold for the journal — the invoice line itself doesn't
  // retain harga beli, so this is computed here while productMap is at hand.
  const hppTotal = input.items.reduce((sum, i) => {
    if (!i.productId) return sum; // custom items have no tracked COGS
    const product = productMap.get(i.productId);
    return sum + (product ? product.hargaBeli * i.qty : 0);
  }, 0);

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

  if (finalize) {
    for (const item of items) {
      if (!item.product) continue; // custom items don't move stock
      await Product.updateOne({ _id: item.product }, { $inc: { stok: -item.qty } });
      await StockMovement.create({
        product: item.product,
        productNameSnapshot: item.namaSnapshot,
        tipe: "keluar",
        qty: item.qty,
        alasan: "Penjualan",
        invoice: invoice._id,
        invoiceNomorSnapshot: invoice.nomor,
        salesSnapshot: invoice.sales!.nama,
        tanggalKirim: invoice.tanggalKirim,
        kurir: invoice.kurir,
      });
    }
    await postInvoiceFinalized(invoice, hppTotal);
  }

  return invoice;
}
