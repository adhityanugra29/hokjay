import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { CashflowEntry } from "@/models/CashflowEntry";
import { postInvoiceDp } from "@/lib/services/journal";

export interface ReceiveDpInput {
  nominal: number;
  metode: string;
  buktiUrl?: string;
  catatan?: string;
}

/**
 * Records a one-time down payment on an already-finalized ("unpaid")
 * invoice — reduces what's still owed without moving status to "paid".
 * Real cash received, so it posts a normal "uang masuk" cashflow entry and
 * journal immediately, same as a full payment (see lib/services/journal.ts's
 * postInvoiceDp). Confirmed with the user 2026-08-25.
 */
export async function receiveDp(invoiceId: string, input: ReceiveDpInput) {
  await dbConnect();

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error("Invoice tidak ditemukan");
  if (invoice.status !== "unpaid") {
    throw new Error(
      invoice.status === "draft" ? "Invoice masih draft, kirim dulu sebelum menerima DP" : "Invoice ini sudah lunas"
    );
  }
  if (invoice.dp?.nominal) throw new Error("DP untuk invoice ini sudah pernah dicatat");
  if (!input.nominal || input.nominal <= 0) throw new Error("Nominal DP harus lebih dari 0");
  if (input.nominal >= invoice.grandTotal) {
    throw new Error("Nominal DP tidak boleh sama dengan atau melebihi total invoice — gunakan Tandai Lunas untuk pelunasan penuh");
  }

  const tanggal = new Date();
  invoice.dp = {
    nominal: input.nominal,
    tanggal,
    metode: input.metode,
    buktiUrl: input.buktiUrl,
    catatan: input.catatan,
  };
  invoice.riwayat.push({
    tanggal,
    keterangan: `DP diterima Rp ${input.nominal.toLocaleString("id-ID")} — sisa Rp ${(invoice.grandTotal - input.nominal).toLocaleString("id-ID")}`,
  });
  await invoice.save();

  await CashflowEntry.create({
    tipe: "masuk",
    keterangan: `DP invoice ${invoice.nomor} — ${invoice.customer!.nama}`,
    kategori: "DP Invoice",
    referensi: invoice.nomor,
    nominal: input.nominal,
    invoice: invoice._id,
    tanggal,
    buktiUrl: input.buktiUrl,
  });

  await postInvoiceDp(invoice, input.nominal, input.metode);

  return invoice;
}
