import { dbConnect } from "@/lib/db";
import { JournalEntry } from "@/models/JournalEntry";
import { accountName } from "@/lib/coa";
import type { InvoiceDoc } from "@/models/Invoice";
import type { HydratedDocument, Types } from "mongoose";

type InvoiceLike = HydratedDocument<InvoiceDoc> | (InvoiceDoc & { _id: Types.ObjectId });

function line(akunKode: string, opts: { debit?: number; credit?: number }) {
  return {
    akunKode,
    akunNama: accountName(akunKode),
    debit: Math.round(opts.debit ?? 0),
    credit: Math.round(opts.credit ?? 0),
  };
}

/**
 * Posts the FULL journal for an invoice reaching "Lunas" — revenue, cost of
 * goods sold, sales commission liability, AND the cash settlement, all in
 * one go. This is now the single point where this app recognizes a sale at
 * all: stock, revenue, HPP and komisi all move together at payment
 * confirmation (see payInvoice.ts) — not at invoice-finalize time as this
 * app's business rules originally had it (see the git history of this file
 * for that earlier rule, changed 2026-08-27 per the user's request so
 * "Booked"/"Sudah DP" invoices genuinely don't touch stock/accounting until
 * the sale is real).
 *
 * If a DP was already received, its amount is sitting in "Uang Muka
 * Pelanggan" (2-2000) — a liability, not revenue, per postInvoiceDp below —
 * and gets cleared into this sale here instead of being double-counted.
 * There's no Piutang (accounts-receivable) leg at all: revenue is only ever
 * recognized at the exact moment cash (DP + final settlement) is fully in
 * hand, so nothing is ever actually "owed" under this app's rules.
 *
 * `hppTotal` (sum of qty x harga beli SNAPSHOT for non-custom items) is
 * passed in — the caller (payInvoice) sums each item's hargaBeliSnapshot,
 * captured at invoice-creation time so a supplier price change between
 * booking and payment doesn't retroactively misstate this specific sale's
 * cost basis.
 */
export async function postInvoiceLunas(invoice: InvoiceLike, hppTotal: number) {
  await dbConnect();

  let gross = 0;
  let diskonTotal = 0;
  let komisiTotal = 0;
  for (const item of invoice.items) {
    gross += item.hargaJual * item.qty;
    diskonTotal += item.diskonPerUnit * item.qty;
    komisiTotal += item.komisiSubtotal;
  }
  const ongkosKirim = invoice.ongkosKirim ?? 0;
  const dpNominal = invoice.dp?.nominal ?? 0;
  const kasAkun = invoice.payment?.metode === "Tunai" ? "1-1100" : "1-1200";
  const kasBaruDiterima = invoice.grandTotal - dpNominal; // the remaining balance actually changing hands right now

  await JournalEntry.create({
    tanggal: invoice.payment?.tanggalBayar ?? new Date(),
    deskripsi: `Invoice ${invoice.nomor} lunas — ${invoice.customer?.nama ?? "-"}`,
    sumberTipe: "invoice-lunas",
    sumberLabel: invoice.nomor,
    invoice: invoice._id,
    lines: [
      ...(dpNominal > 0 ? [line("2-2000", { debit: dpNominal })] : []), // clear the DP liability into this sale
      line(kasAkun, { debit: kasBaruDiterima }),
      line("4-1900", { debit: diskonTotal }),
      line("4-1000", { credit: gross }),
      ...(ongkosKirim > 0 ? [line("4-1100", { credit: ongkosKirim })] : []),
    ],
  });

  if (hppTotal > 0) {
    await JournalEntry.create({
      tanggal: invoice.payment?.tanggalBayar ?? new Date(),
      deskripsi: `HPP invoice ${invoice.nomor}`,
      sumberTipe: "invoice-hpp",
      sumberLabel: invoice.nomor,
      invoice: invoice._id,
      lines: [line("5-1000", { debit: hppTotal }), line("1-3000", { credit: hppTotal })],
    });
  }

  if (komisiTotal > 0) {
    await JournalEntry.create({
      tanggal: invoice.payment?.tanggalBayar ?? new Date(),
      deskripsi: `Komisi sales invoice ${invoice.nomor}`,
      sumberTipe: "invoice-komisi",
      sumberLabel: invoice.nomor,
      invoice: invoice._id,
      lines: [line("6-1000", { debit: komisiTotal }), line("2-1000", { credit: komisiTotal })],
    });
  }
}

/**
 * Posts the journal for the (now-retired) old finalize-time cash
 * settlement rule — kept only so an invoice that was already finalized
 * under the OLD rule (has an "invoice-finalisasi" entry — see
 * payInvoice.ts's backward-compat check) still gets its final cash-in
 * leg posted correctly against Piutang, the account that old rule
 * actually used. Never called for any invoice created after 2026-08-27.
 */
export async function postInvoicePaidLegacy(invoice: InvoiceLike, nominal?: number) {
  await dbConnect();
  const kasAkun = invoice.payment?.metode === "Tunai" ? "1-1100" : "1-1200";
  const amount = nominal ?? invoice.grandTotal;

  await JournalEntry.create({
    tanggal: invoice.payment?.tanggalBayar ?? new Date(),
    deskripsi: `Pembayaran invoice ${invoice.nomor} — ${invoice.customer?.nama ?? "-"}`,
    sumberTipe: "invoice-lunas",
    sumberLabel: invoice.nomor,
    invoice: invoice._id,
    lines: [line(kasAkun, { debit: amount }), line("1-2000", { credit: amount })],
  });
}

/**
 * Posts the journal for a DP (down payment) received on an invoice — real
 * cash in hand, but revenue isn't recognized until "Lunas" (see
 * postInvoiceLunas above), so this books it as a liability ("Uang Muka
 * Pelanggan") rather than crediting Piutang — there's no receivable to
 * reduce yet, nothing has been recognized as owed. Changed 2026-08-27; see
 * postInvoiceDpLegacy below for the old rule.
 */
export async function postInvoiceDp(invoice: InvoiceLike, nominal: number, metode: string) {
  await dbConnect();
  const kasAkun = metode === "Tunai" ? "1-1100" : "1-1200";

  await JournalEntry.create({
    tanggal: invoice.dp?.tanggal ?? new Date(),
    deskripsi: `DP invoice ${invoice.nomor} — ${invoice.customer?.nama ?? "-"}`,
    sumberTipe: "invoice-dp",
    sumberLabel: invoice.nomor,
    invoice: invoice._id,
    lines: [line(kasAkun, { debit: nominal }), line("2-2000", { credit: nominal })],
  });
}

/**
 * The old DP posting rule (credits Piutang, 1-2000) — kept only for
 * invoices already finalized under the pre-2026-08-27 rule (see
 * payInvoice.ts's backward-compat check), where Piutang for the full
 * grandTotal was already debited at finalize time and a DP genuinely does
 * reduce it. Never called for any invoice created after that date.
 */
export async function postInvoiceDpLegacy(invoice: InvoiceLike, nominal: number, metode: string) {
  await dbConnect();
  const kasAkun = metode === "Tunai" ? "1-1100" : "1-1200";

  await JournalEntry.create({
    tanggal: invoice.dp?.tanggal ?? new Date(),
    deskripsi: `DP invoice ${invoice.nomor} — ${invoice.customer?.nama ?? "-"}`,
    sumberTipe: "invoice-dp",
    sumberLabel: invoice.nomor,
    invoice: invoice._id,
    lines: [line(kasAkun, { debit: nominal }), line("1-2000", { credit: nominal })],
  });
}

/** Posts the journal for a sales-commission payout ("Tandai Cair" / Bayar Komisi). */
export async function postCommissionPaid(invoice: InvoiceLike, tanggal?: Date) {
  await dbConnect();
  const komisiTotal = invoice.items.reduce((s, i) => s + i.komisiSubtotal, 0);
  if (komisiTotal <= 0) return;

  await JournalEntry.create({
    tanggal: tanggal ?? new Date(),
    deskripsi: `Pencairan komisi sales — invoice ${invoice.nomor}`,
    sumberTipe: "komisi-cair",
    sumberLabel: invoice.nomor,
    invoice: invoice._id,
    lines: [line("2-1000", { debit: komisiTotal }), line("1-1100", { credit: komisiTotal })],
  });
}

/**
 * Posts the journal for a manual cash-out entry (see
 * lib/services/recordCashflow.ts) — `akunKode` is whichever expense/asset
 * account the user picked on the form (see lib/coa.ts's
 * manualExpenseAccounts()). There's no kas/bank distinction on
 * CashflowEntry today, so this defaults to Kas (1-1100).
 */
export async function postCashflowKeluar(entry: { keterangan: string; akunKode: string; nominal: number; tanggal?: Date }) {
  await dbConnect();
  await JournalEntry.create({
    tanggal: entry.tanggal ?? new Date(),
    deskripsi: entry.keterangan,
    sumberTipe: "cashflow-keluar",
    lines: [line(entry.akunKode, { debit: entry.nominal }), line("1-1100", { credit: entry.nominal })],
  });
}

/**
 * Posts the journal for a manual cash-in entry that isn't an invoice
 * payment (capital injection, other income, etc.) — `akunKode` is whichever
 * income/equity account the user picked (see lib/coa.ts's
 * manualIncomeAccounts()).
 */
export async function postCashflowMasuk(entry: { keterangan: string; akunKode: string; nominal: number; tanggal?: Date }) {
  await dbConnect();
  await JournalEntry.create({
    tanggal: entry.tanggal ?? new Date(),
    deskripsi: entry.keterangan,
    sumberTipe: "cashflow-masuk",
    lines: [line("1-1100", { debit: entry.nominal }), line(entry.akunKode, { credit: entry.nominal })],
  });
}

/**
 * Reconciles the opening-cash-balance journal entry (see
 * app/admin/keuangan — "Kas Awal"). Idempotent: replaces whatever "kas-awal"
 * entry existed before, so editing the setting doesn't pile up duplicates.
 * Debits Kas, credits Modal Pemilik — a zero amount just clears it.
 */
export async function postKasAwal(amount: number, tanggal: Date) {
  await dbConnect();
  await JournalEntry.deleteMany({ sumberTipe: "kas-awal" });
  if (amount > 0) {
    await JournalEntry.create({
      tanggal,
      deskripsi: "Kas awal (saldo pembukaan)",
      sumberTipe: "kas-awal",
      lines: [line("1-1100", { debit: amount }), line("3-1000", { credit: amount })],
    });
  }
}
