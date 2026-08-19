import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { CashflowEntry } from "@/models/CashflowEntry";
import { postInvoicePaid } from "@/lib/services/journal";

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
 * cashflow "uang masuk" entry, and appends a history line. Stock and
 * commission were already handled at invoice creation.
 */
export async function payInvoice(invoiceId: string, input: PayInvoiceInput) {
  await dbConnect();

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error("Invoice tidak ditemukan");
  if (invoice.status === "paid") throw new Error("Invoice sudah lunas");
  if (invoice.status === "draft") throw new Error("Invoice masih draft, kirim dulu sebelum konfirmasi pembayaran");

  invoice.status = "paid";
  invoice.payment = {
    metode: input.metode,
    nominalDiterima: input.nominalDiterima ?? invoice.grandTotal,
    buktiUrl: input.buktiUrl,
    tanggalBayar: new Date(),
    noResi: input.noResi,
    catatan: input.catatan,
  };
  if (input.tanggalKirim) invoice.tanggalKirim = new Date(input.tanggalKirim);
  if (input.kurir) invoice.kurir = input.kurir;

  invoice.riwayat.push({ tanggal: new Date(), keterangan: "Pembayaran dikonfirmasi — status Lunas" });

  await invoice.save();

  await CashflowEntry.create({
    tipe: "masuk",
    keterangan: `Pembayaran invoice lunas — ${invoice.customer!.nama}`,
    kategori: "Pembayaran Invoice",
    referensi: invoice.nomor,
    nominal: invoice.grandTotal,
    invoice: invoice._id,
  });

  await postInvoicePaid(invoice);

  return invoice;
}
