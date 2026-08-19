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
      line("1200", { debit: invoice.grandTotal }),
      line("4900", { debit: diskonTotal }),
      line("4100", { credit: gross }),
      ...(ongkosKirim > 0 ? [line("4200", { credit: ongkosKirim })] : []),
    ],
  });

  if (hppTotal > 0) {
    await JournalEntry.create({
      tanggal: invoice.tanggalInvoice ?? new Date(),
      deskripsi: `HPP invoice ${invoice.nomor}`,
      sumberTipe: "invoice-hpp",
      sumberLabel: invoice.nomor,
      invoice: invoice._id,
      lines: [line("5100", { debit: hppTotal }), line("1300", { credit: hppTotal })],
    });
  }

  if (komisiTotal > 0) {
    await JournalEntry.create({
      tanggal: invoice.tanggalInvoice ?? new Date(),
      deskripsi: `Komisi sales invoice ${invoice.nomor}`,
      sumberTipe: "invoice-komisi",
      sumberLabel: invoice.nomor,
      invoice: invoice._id,
      lines: [line("6100", { debit: komisiTotal }), line("2200", { credit: komisiTotal })],
    });
  }
}

/** Posts the journal for an invoice payment confirmation (status -> paid). */
export async function postInvoicePaid(invoice: InvoiceLike) {
  await dbConnect();
  const kasAkun = invoice.payment?.metode === "Tunai" ? "1101" : "1102";

  await JournalEntry.create({
    tanggal: invoice.payment?.tanggalBayar ?? new Date(),
    deskripsi: `Pembayaran invoice ${invoice.nomor} — ${invoice.customer?.nama ?? "-"}`,
    sumberTipe: "invoice-lunas",
    sumberLabel: invoice.nomor,
    invoice: invoice._id,
    lines: [line(kasAkun, { debit: invoice.grandTotal }), line("1200", { credit: invoice.grandTotal })],
  });
}

/** Posts the journal for a sales-commission payout ("Tandai Cair"). */
export async function postCommissionPaid(invoice: InvoiceLike) {
  await dbConnect();
  const komisiTotal = invoice.items.reduce((s, i) => s + i.komisiSubtotal, 0);
  if (komisiTotal <= 0) return;

  await JournalEntry.create({
    tanggal: new Date(),
    deskripsi: `Pencairan komisi sales — invoice ${invoice.nomor}`,
    sumberTipe: "komisi-cair",
    sumberLabel: invoice.nomor,
    invoice: invoice._id,
    lines: [line("2200", { debit: komisiTotal }), line("1101", { credit: komisiTotal })],
  });
}

/**
 * Posts the journal for a manual cash-out entry (see lib/services/addExpense.ts).
 * "Pembelian Stok" increases inventory value; other categories are expensed
 * immediately. There's no kas/bank distinction on CashflowEntry today, so
 * this defaults to Kas (1101) — see the accounting page's notes.
 */
export async function postCashflowKeluar(entry: { keterangan: string; kategori: string; nominal: number; tanggal?: Date }) {
  await dbConnect();
  const akun = entry.kategori === "Pembelian Stok" ? "1300" : entry.kategori === "Operasional" ? "6300" : "6900";

  await JournalEntry.create({
    tanggal: entry.tanggal ?? new Date(),
    deskripsi: entry.keterangan,
    sumberTipe: "cashflow-keluar",
    lines: [line(akun, { debit: entry.nominal }), line("1101", { credit: entry.nominal })],
  });
}
