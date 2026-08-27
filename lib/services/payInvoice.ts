import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Product } from "@/models/Product";
import { StockMovement } from "@/models/StockMovement";
import { JournalEntry } from "@/models/JournalEntry";
import { CashflowEntry } from "@/models/CashflowEntry";
import { postInvoiceLunas, postInvoicePaidLegacy } from "@/lib/services/journal";

export interface PayInvoiceInput {
  metode: string;
  nominalDiterima?: number;
  buktiUrl?: string;
  tanggalKirim?: Date | string;
  kurir?: string;
  noResi?: string;
  catatan?: string;
}

/**
 * Marks an invoice paid: status -> paid, records payment details, logs a
 * cashflow "uang masuk" entry, and appends a history line.
 *
 * Since 2026-08-27, this is also where stock actually leaves inventory and
 * where revenue/HPP/komisi are recognized (see postInvoiceLunas in
 * lib/services/journal.ts) — a "Booked" or "Sudah DP" invoice doesn't touch
 * either until the sale is genuinely final here. Because stock isn't
 * reserved between booking and payment, several open invoices can compete
 * for the same units, so the availability check that actually blocks
 * overselling is the one below, not the soft one at booking time.
 *
 * Backward compatible with an invoice that was already finalized under the
 * OLD rule (stock/journal posted at "unpaid" time, before this date) —
 * detected by the presence of its "invoice-finalisasi" journal entry, in
 * which case stock is NOT deducted again and only the old cash-settlement
 * leg (postInvoicePaidLegacy, against Piutang) is posted, exactly as this
 * function used to behave.
 */
export async function payInvoice(invoiceId: string, input: PayInvoiceInput) {
  await dbConnect();

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error("Invoice tidak ditemukan");
  if (invoice.status === "paid") throw new Error("Invoice sudah lunas");
  if (invoice.status === "draft") throw new Error("Invoice masih draft, kirim dulu sebelum konfirmasi pembayaran");

  const legacyFinalized = await JournalEntry.exists({ invoice: invoice._id, sumberTipe: "invoice-finalisasi" });

  if (!legacyFinalized) {
    // Authoritative stock check — nothing reserved this until now, so a
    // product could have been over-booked across several open invoices.
    const productIds = invoice.items.filter((i) => i.product).map((i) => i.product);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((p) => [String(p._id), p]));
    for (const item of invoice.items) {
      if (!item.product) continue;
      const product = productMap.get(String(item.product));
      if (!product) throw new Error(`Produk ${item.namaSnapshot} tidak ditemukan`);
      if (product.stok < item.qty) {
        throw new Error(`Stok ${item.namaSnapshot} tidak cukup untuk melunasi invoice ini (sisa ${product.stok})`);
      }
    }
  }

  // If a DP was already received, its share was already credited to "Uang
  // Muka Pelanggan" (or Piutang, for a legacy-finalized invoice) — only the
  // remaining balance actually changes hands, and gets recorded, here.
  const sisaTagihan = invoice.grandTotal - (invoice.dp?.nominal ?? 0);

  invoice.status = "paid";
  invoice.payment = {
    metode: input.metode,
    nominalDiterima: input.nominalDiterima ?? sisaTagihan,
    buktiUrl: input.buktiUrl,
    tanggalBayar: new Date(),
    noResi: input.noResi,
    catatan: input.catatan,
  };
  if (input.tanggalKirim) invoice.tanggalKirim = new Date(input.tanggalKirim);
  if (input.kurir) invoice.kurir = input.kurir;

  invoice.riwayat.push({ tanggal: new Date(), keterangan: "Pembayaran dikonfirmasi — status Lunas" });

  await invoice.save();

  if (!legacyFinalized) {
    for (const item of invoice.items) {
      if (!item.product) continue;
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
  }

  await CashflowEntry.create({
    tipe: "masuk",
    keterangan: `Pembayaran invoice lunas — ${invoice.customer!.nama}`,
    kategori: "Pembayaran Invoice",
    referensi: invoice.nomor,
    nominal: sisaTagihan,
    invoice: invoice._id,
  });

  if (legacyFinalized) {
    await postInvoicePaidLegacy(invoice, sisaTagihan);
  } else {
    const hppTotal = invoice.items.reduce((sum, i) => sum + (i.hargaBeliSnapshot ?? 0) * i.qty, 0);
    await postInvoiceLunas(invoice, hppTotal);
  }

  return invoice;
}
