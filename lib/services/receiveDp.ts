import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { JournalEntry } from "@/models/JournalEntry";
import { CashflowEntry } from "@/models/CashflowEntry";
import { postInvoiceDp, postInvoiceDpLegacy } from "@/lib/services/journal";

export interface ReceiveDpInput {
  nominal: number;
  metode: string;
  buktiUrl?: string;
  catatan?: string;
}

/**
 * Records a one-time down payment on a sent ("unpaid") invoice — reduces
 * what's still owed without moving status to "paid". Real cash received,
 * so it posts a normal "uang masuk" cashflow entry immediately, same as a
 * full payment. Confirmed with the user 2026-08-25.
 *
 * The journal side books this as a liability ("Uang Muka Pelanggan") since
 * 2026-08-27 — revenue isn't recognized until "Lunas" (see
 * lib/services/journal.ts's postInvoiceLunas), so there's no Piutang to
 * reduce yet. The one exception: a pre-2026-08-27 legacy-finalized invoice
 * (detected via its "invoice-finalisasi" journal entry) already has the
 * full grandTotal debited to Piutang at finalize time, so a DP on one of
 * those genuinely does reduce it — postInvoiceDpLegacy handles that case.
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

  const legacyFinalized = await JournalEntry.exists({ invoice: invoice._id, sumberTipe: "invoice-finalisasi" });
  if (legacyFinalized) {
    await postInvoiceDpLegacy(invoice, input.nominal, input.metode);
  } else {
    await postInvoiceDp(invoice, input.nominal, input.metode);
  }

  return invoice;
}
