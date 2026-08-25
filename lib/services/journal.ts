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
 * Posts the journal for an invoice being finalized (status draft -> unpaid),
 * the moment this app recognizes revenue, cost of goods sold, and the sales
 * commission liability — matching when this app actually decrements stock
 * and snapshots commission (at creation, not at "Lunas" as the original
 * accounting doc assumed before this app's business rules were finalized).
 *
 * `hppTotal` (sum of qty x harga beli for non-custom items) is passed in
 * because the invoice document itself doesn't retain each product's harga
 * beli — the caller (createInvoice) already has it from its product lookup.
 */
export async function postInvoiceFinalized(invoice: InvoiceLike, hppTotal: number) {
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

  await JournalEntry.create({
    tanggal: invoice.tanggalInvoice ?? new Date(),
    deskripsi: `Invoice ${invoice.nomor} difinalisasi — ${invoice.customer?.nama ?? "-"}`,
    sumberTipe: "invoice-finalisasi",
    sumberLabel: invoice.nomor,
    invoice: invoice._id,
    lines: [
      line("1-2000", { debit: invoice.grandTotal }),
      line("4-1900", { debit: diskonTotal }),
      line("4-1000", { credit: gross }),
      ...(ongkosKirim > 0 ? [line("4-1100", { credit: ongkosKirim })] : []),
    ],
  });

  if (hppTotal > 0) {
    await JournalEntry.create({
      tanggal: invoice.tanggalInvoice ?? new Date(),
      deskripsi: `HPP invoice ${invoice.nomor}`,
      sumberTipe: "invoice-hpp",
      sumberLabel: invoice.nomor,
      invoice: invoice._id,
      lines: [line("5-1000", { debit: hppTotal }), line("1-3000", { credit: hppTotal })],
    });
  }

  if (komisiTotal > 0) {
    await JournalEntry.create({
      tanggal: invoice.tanggalInvoice ?? new Date(),
      deskripsi: `Komisi sales invoice ${invoice.nomor}`,
      sumberTipe: "invoice-komisi",
      sumberLabel: invoice.nomor,
      invoice: invoice._id,
      lines: [line("6-1000", { debit: komisiTotal }), line("2-1000", { credit: komisiTotal })],
    });
  }
}

/**
 * Posts the journal for an invoice payment confirmation (status -> paid).
 * `nominal` defaults to the full grandTotal, but the caller (payInvoice)
 * passes the remaining balance instead when a DP was already received —
 * the DP's share of the Piutang was already credited by postInvoiceDp, so
 * crediting the full grandTotal again here would double-count it.
 */
export async function postInvoicePaid(invoice: InvoiceLike, nominal?: number) {
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

/** Posts the journal for a DP (down payment) received on an invoice — reduces Piutang by the DP amount without touching status. */
export async function postInvoiceDp(invoice: InvoiceLike, nominal: number, metode: string) {
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
