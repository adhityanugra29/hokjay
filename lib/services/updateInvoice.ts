import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { Invoice } from "@/models/Invoice";
import { StockMovement } from "@/models/StockMovement";
import { JournalEntry } from "@/models/JournalEntry";
import { computeLineCommission, maxDiskonBekas } from "@/lib/commission";
import { formatDimensi } from "@/lib/format";
import type { CreateInvoiceInput } from "@/lib/services/createInvoice";

/**
 * Edits a draft or unpaid invoice in place (same _id and nomor) — lets a
 * mistake get fixed without re-typing everything, without the gap-prone
 * "delete and recreate" pattern. Paid invoices are not editable here: once
 * money and commission have actually changed hands, this app treats that as
 * final (see /invoice/[id] for the read-only view).
 *
 * Editing an unpaid invoice has no stock/accounting side effect to redo
 * anymore — since 2026-08-27, Booked/Sudah DP invoices never touch stock or
 * post any journal until actual payment (see payInvoice.ts). The one
 * exception: an invoice that was already finalized under the OLD rule
 * (stock deducted + journal posted at "unpaid" time, before that date) —
 * for those, this reverses that old side effect first, so continuing to
 * edit it doesn't leave stock short or the books stale. After that reversal
 * it behaves exactly like any other new-style unpaid invoice going forward
 * — no re-application, since new-style unpaid invoices don't touch stock at
 * all.
 */
export async function updateInvoice(invoiceId: string, input: CreateInvoiceInput) {
  await dbConnect();

  const existing = await Invoice.findById(invoiceId);
  if (!existing) throw new Error("Invoice tidak ditemukan");
  if (existing.status === "paid") throw new Error("Invoice yang sudah lunas tidak bisa diubah");

  // Reverse a pre-2026-08-27 legacy finalization's side effects, if any —
  // detected by the presence of the old "invoice-finalisasi" journal entry
  // rather than by status alone, since a new-style unpaid invoice never had
  // one to begin with.
  const legacyFinalized = await JournalEntry.exists({ invoice: existing._id, sumberTipe: "invoice-finalisasi" });
  if (legacyFinalized) {
    for (const item of existing.items) {
      if (!item.product) continue;
      await Product.updateOne({ _id: item.product }, { $inc: { stok: item.qty } });
    }
    await StockMovement.deleteMany({ invoice: existing._id });
    await JournalEntry.deleteMany({ invoice: existing._id });
  }

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
      // No diskon cap for custom items — see createInvoice.ts's matching
      // comment.
      const diskon = rawDiskon;
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
    // Soft check only — see createInvoice.ts's matching comment.
    if (finalize && product.stok < i.qty) {
      throw new Error(`Stok ${product.name} tidak cukup (sisa ${product.stok})`);
    }
    // While Flash Sale is active — see createInvoice.ts's matching
    // comment.
    const effectiveHargaMinimum =
      product.flashSale?.active && product.flashSale?.harga ? product.flashSale.harga : product.hargaMinimum;
    // Diskon cap for barang bekas — server-side enforcement, see
    // createInvoice.ts's matching comment.
    const diskon =
      product.kondisi === "bekas"
        ? Math.min(rawDiskon, maxDiskonBekas(i.hargaJual, effectiveHargaMinimum))
        : rawDiskon;
    const subtotal = (i.hargaJual - diskon) * i.qty;
    // See createInvoice.ts's matching comment.
    const komisiPerItem = computeLineCommission({
      kondisi: product.kondisi as "baru" | "bekas",
      hargaJual: i.hargaJual,
      hargaMinimum: effectiveHargaMinimum,
      diskon,
    });
    return {
      product: product._id,
      isCustom: false,
      namaSnapshot: product.name,
      dimensiSnapshot: formatDimensi(product.dimensi),
      qty: i.qty,
      hargaJual: i.hargaJual,
      hargaMinimumSnapshot: effectiveHargaMinimum,
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

  existing.set({
    customer: {
      ref: input.customerId || undefined,
      nama: input.customerNama,
      whatsapp: input.customerWhatsapp,
    },
    shipAddress: input.shipAddress,
    sales: { ref: input.salesId || undefined, nama: input.salesNama },
    tanggalInvoice: input.tanggalInvoice ? new Date(input.tanggalInvoice) : existing.tanggalInvoice,
    tanggalKirim: input.tanggalKirim ? new Date(input.tanggalKirim) : undefined,
    kurir: input.kurir,
    ongkosKirim,
    items,
    subtotalProduk,
    grandTotal,
    status: input.status,
  });
  existing.riwayat.push({
    tanggal: new Date(),
    keterangan: finalize ? "Invoice diubah & terkirim ke pelanggan" : "Invoice diubah (masih draft)",
  });

  await existing.save();

  return existing;
}
