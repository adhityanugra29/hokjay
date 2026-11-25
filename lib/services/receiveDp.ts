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
 * Records a down payment on a sent ("unpaid") invoice — can be called
 * repeatedly (DP bertahap) as long as the cumulative DP stays below
 * grandTotal; each call is its own cashflow + journal entry. Reduces
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
  if (!input.nominal || input.nominal <= 0) throw new Error("Nominal DP harus lebih dari 0");
  const dpLama = invoice.dp?.nominal ?? 0;
  const totalDp = dpLama + input.nominal;
  if (totalDp >= invoice.grandTotal) {
    throw new Error(
      dpLama
        ? "Total DP tidak boleh sama dengan atau melebihi total invoice — gunakan Tandai Lunas untuk pelunasan"
        : "Nominal DP tidak boleh sama dengan atau melebihi total invoice — gunakan Tandai Lunas untuk pelunasan penuh"
    );
  }

  const tanggal = new Date();
  // Pre-cicilan invoice: its single DP becomes cicilan #1 first. Idempotent
  // (only matches while cicilan is still empty), so a concurrent request can't
  // backfill it twice.
  if (dpLama && !invoice.dp!.cicilan?.length) {
    await Invoice.updateOne(
      { _id: invoice._id, "dp.nominal": { $gt: 0 }, "dp.cicilan.0": { $exists: false } },
      {
        $push: {
          "dp.cicilan": {
            nominal: dpLama,
            tanggal: invoice.dp!.tanggal,
            metode: invoice.dp!.metode,
            buktiUrl: invoice.dp!.buktiUrl,
            catatan: invoice.dp!.catatan,
          },
        },
      }
    );
  }

  // Atomic: the total is incremented (never overwritten from a stale read) and
  // the cumulative < grandTotal check runs inside the same write, so two DPs
  // submitted at once (double click, two tabs/users) are BOTH counted — never
  // one recorded and one lost.
  const updated = await Invoice.findOneAndUpdate(
    {
      _id: invoice._id,
      status: "unpaid",
      $expr: { $lt: [{ $add: [{ $ifNull: ["$dp.nominal", 0] }, input.nominal] }, "$grandTotal"] },
    },
    {
      $inc: { "dp.nominal": input.nominal },
      $set: {
        "dp.tanggal": tanggal,
        "dp.metode": input.metode,
        "dp.buktiUrl": input.buktiUrl,
        "dp.catatan": input.catatan,
      },
      $push: {
        "dp.cicilan": { nominal: input.nominal, tanggal, metode: input.metode, buktiUrl: input.buktiUrl, catatan: input.catatan },
      },
    },
    { new: true }
  );
  if (!updated) {
    throw new Error("DP gagal dicatat — total DP akan melebihi total invoice atau status invoice baru saja berubah. Muat ulang halaman.");
  }
  const invoiceBaru = updated;
  const ke = invoiceBaru.dp!.cicilan.length;
  const totalBaru = invoiceBaru.dp!.nominal ?? 0;
  await Invoice.updateOne(
    { _id: invoice._id },
    {
      $push: {
        riwayat: {
          tanggal,
          keterangan: `DP${ke > 1 ? ` ke-${ke}` : ""} diterima Rp ${input.nominal.toLocaleString("id-ID")} — sisa Rp ${(invoice.grandTotal - totalBaru).toLocaleString("id-ID")}`,
        },
      },
    }
  );

  await CashflowEntry.create({
    tipe: "masuk",
    keterangan: `DP${ke > 1 ? ` ke-${ke}` : ""} invoice ${invoice.nomor} — ${invoice.customer!.nama}`,
    kategori: "DP Invoice",
    referensi: invoice.nomor,
    nominal: input.nominal,
    invoice: invoice._id,
    tanggal,
    buktiUrl: input.buktiUrl,
  });

  const legacyFinalized = await JournalEntry.exists({ invoice: invoice._id, sumberTipe: "invoice-finalisasi" });
  if (legacyFinalized) {
    await postInvoiceDpLegacy(invoiceBaru, input.nominal, input.metode);
  } else {
    await postInvoiceDp(invoiceBaru, input.nominal, input.metode);
  }

  return invoiceBaru;
}
