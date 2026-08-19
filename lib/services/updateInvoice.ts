import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { Invoice } from "@/models/Invoice";
import { StockMovement } from "@/models/StockMovement";
import { JournalEntry } from "@/models/JournalEntry";
import { computeLineCommission } from "@/lib/commission";
import { postInvoiceFinalized } from "@/lib/services/journal";
import type { CreateInvoiceInput } from "@/lib/services/createInvoice";

/**
 * Edits a draft or unpaid invoice in place (same _id and nomor) — lets a
 * mistake get fixed without re-typing everything, without the gap-prone
 * "delete and recreate" pattern. Paid invoices are not editable here: once
 * money and commission have actually changed hands, this app treats that as
 * final (see /invoice/[id] for the read-only view).
 *
 * If the invoice being edited had already been finalized (status "unpaid"),
 * its stock decrement and journal entries are reversed first, then
 * re-applied against the new data — so editing an unpaid invoice several
 * times never double-counts stock or accounting.
 */
export async function updateInvoice(invoiceId: string, input: CreateInvoiceInput) {
  await dbConnect();

  const existing = await Invoice.findById(invoiceId);
  if (!existing) throw new Error("Invoice tidak ditemukan");
  if (existing.status === "paid") throw new Error("Invoice yang sudah lunas tidak bisa diubah");

  // Reverse the previous finalization's side effects, if any.
  if (existing.status === "unpaid") {
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
    const diskon = i.diskonPerUnit ?? 0;
    const subtotal = (i.hargaJual - diskon) * i.qty;

    if (!i.productId) {
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

  const hppTotal = input.items.reduce((sum, i) => {
    if (!i.productId) return sum;
    const product = productMap.get(i.productId);
    return sum + (product ? product.hargaBeli * i.qty : 0);
  }, 0);

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

  if (finalize) {
    for (const item of items) {
      if (!item.product) continue;
      await Product.updateOne({ _id: item.product }, { $inc: { stok: -item.qty } });
      await StockMovement.create({
        product: item.product,
        productNameSnapshot: item.namaSnapshot,
        tipe: "keluar",
        qty: item.qty,
        alasan: "Penjualan",
        invoice: existing._id,
        invoiceNomorSnapshot: existing.nomor,
        salesSnapshot: existing.sales!.nama,
        tanggalKirim: existing.tanggalKirim,
        kurir: existing.kurir,
      });
    }
    await postInvoiceFinalized(existing, hppTotal);
  }

  return existing;
}
