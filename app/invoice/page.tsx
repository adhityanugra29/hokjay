import PageHeader from "@/components/layout/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import InvoiceListClient, {
  type InvoiceRow,
  type InvoiceRowStatus,
  type InvoiceFilterKey,
  type InvoiceListCounts,
} from "@/components/invoice/InvoiceListClient";
import Pagination from "@/components/ui/Pagination";
import { parsePage, clampPageOrRedirect } from "@/lib/pagination";
import InvoiceFilterBar from "@/components/invoice/InvoiceFilterBar";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Sales } from "@/models/Sales";
import type { Types } from "mongoose";
import { formatDateShort } from "@/lib/format";
import { currentJakartaMonthYear, jakartaMonthRange, jakartaYearRange } from "@/lib/timezone";
import { getSession } from "@/lib/auth/session";
import { invoiceVisibilityFilter } from "@/lib/invoice-visibility";

/** Mongo condition for each status pill. "dp" = unpaid with a DP received; "unpaid" = unpaid with none (a missing, null or 0 DP). */
const STATUS_CLAUSE: Record<InvoiceRowStatus, Record<string, unknown>> = {
  draft: { status: "draft" },
  paid: { status: "paid" },
  dp: { status: "unpaid", "dp.nominal": { $gt: 0 } },
  unpaid: { status: "unpaid", "dp.nominal": { $not: { $gt: 0 } } },
};
const STATUS_KEYS = ["unpaid", "dp", "draft", "paid"] as const;

export const dynamic = "force-dynamic";

function hariBerjalan(from: Date | string) {
  return Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 86_400_000));
}

/**
 * Invoice list — one flat list filtered through a pill toggle, NOT stacked
 * into separate sections. Per the user's request 2026-09-04, which
 * explicitly reversed the earlier "3 sections" version ("kamu jangan
 * pisah itu berdasarkan line... seharusnya kamu grouping dan ada semacam
 * button tambahan"). All the actual grouping/filtering/Preview-drawer
 * state lives in InvoiceListClient.tsx — this page just fetches and
 * shapes the data.
 */
export default async function InvoiceListPage({ searchParams }: PageProps<"/invoice">) {
  const sp = await searchParams;
  const { search } = sp;
  await dbConnect();

  const session = await getSession();
  // Per-sales invoice privacy — per the user's request 2026-08-29. Same
  // pattern as Pelanggan's own customerVisibilityFilter.
  const filter: Record<string, unknown> = { ...invoiceVisibilityFilter(session) };
  if (search) {
    filter.$or = [
      { nomor: { $regex: search, $options: "i" } },
      { "customer.nama": { $regex: search, $options: "i" } },
    ];
  }

  // Sales filter — only meaningful for a non-"sales" session; a "sales"
  // session is already pinned to their own name by invoiceVisibilityFilter
  // above, so the dropdown isn't even rendered for them (see below).
  const salesFilter = session?.role !== "sales" && typeof sp.sales === "string" ? sp.sales : undefined;
  if (salesFilter) filter["sales.nama"] = salesFilter;

  const nowJakarta = currentJakartaMonthYear();

  // Periode filter — per the user's request 2026-09-04 ("tambahkan di
  // html itu periode, supaya user bisa untuk filter bulanya"). Both
  // default to "Semua" (unfiltered, the pre-existing behavior) unlike the
  // shared PeriodPicker.tsx elsewhere, which always pins to one month —
  // Invoice's default view is everything, browsing history is the
  // exception. tanggalInvoice always has a real value (schema default:
  // Date.now — see models/Invoice.ts), so this can filter on it directly,
  // no createdAt fallback needed the way display code elsewhere has one.
  const bulan = sp.bulan ? Number(sp.bulan) : undefined;
  const tahun = sp.tahun ? Number(sp.tahun) : undefined;
  if (bulan || tahun) {
    const range = bulan ? jakartaMonthRange(tahun ?? nowJakarta.year, bulan) : jakartaYearRange(tahun!);
    filter.tanggalInvoice = { $gte: range.from, $lt: range.to };
  }

  // Which Bulan/Tahun options actually have data — per the user's request
  // 2026-09-04 ("jika tidak ada datanya, gaperlu dimunculin: contoh tidak
  // ada bulan januari di datanya, di filternya, tidak perlu untuk
  // dishow"). Scoped to the same visibility filter as the list itself (a
  // sales rep only sees their own invoices, so their periode options
  // should match — not the visibility+search+periode filter above, since
  // narrowing by the currently-typed search text would make the dropdown
  // options themselves shift while typing, which reads as broken rather
  // than helpful). $month/$year in Asia/Jakarta so a late-night invoice
  // never gets bucketed into the wrong day's month/year versus what
  // jakartaMonthRange/jakartaYearRange filter by above.
  // Status pill and page live in the URL: the server counts and pages through just what is shown.
  const statusParam = typeof sp.status === "string" ? sp.status : "";
  const status: InvoiceFilterKey = (STATUS_KEYS as readonly string[]).includes(statusParam) ? (statusParam as InvoiceRowStatus) : "semua";
  const { page, pageSize, skip } = parsePage(sp);
  const pageFilter = status === "semua" ? filter : { $and: [filter, STATUS_CLAUSE[status]] };

  // Same expressions as the row mapping below ("dp" = unpaid with a DP; finished = paid AND shipped), evaluated in the database.
  const dpAmount = { $ifNull: ["$dp.nominal", 0] };
  const statusKey = {
    $switch: {
      branches: [
        { case: { $eq: ["$status", "draft"] }, then: "draft" },
        { case: { $eq: ["$status", "paid"] }, then: "paid" },
        { case: { $gt: [dpAmount, 0] }, then: "dp" },
      ],
      default: "unpaid",
    },
  };
  const paidAndShipped = { $and: [{ $eq: ["$status", "paid"] }, { $eq: ["$dikirim", true] }] };

  // One page of invoices. Under "Semua" the list is grouped "Perlu tindakan" first, then "Selesai" (newest first within each), so the ids are ordered that way in
  // the database and only this page's invoices are loaded; a single status is just newest-first.
  const loadPageInvoices = async () => {
    if (status !== "semua") {
      return await Invoice.find(pageFilter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(pageSize);
    }
    const ids = await Invoice.aggregate<{ _id: Types.ObjectId }>([
      { $match: filter },
      { $addFields: { selesai: paidAndShipped } },
      { $sort: { selesai: 1, createdAt: -1, _id: -1 } },
      { $skip: skip },
      { $limit: pageSize },
      { $project: { _id: 1 } },
    ]);
    const docs = await Invoice.find({ _id: { $in: ids.map((d) => d._id) } });
    const byId = new Map(docs.map((d) => [String(d._id), d]));
    return ids.map((d) => byId.get(String(d._id))).filter((d): d is NonNullable<typeof d> => !!d);
  };

  // The reads are independent, so they run together. Sales options are only fetched for non-"sales" sessions (see salesFilter above): the roster, not just
  // names on invoices, so a rep with no invoices still shows up. `groups` gives every pill count and total for the current search/sales/periode filters.
  const [periodeAgg, salesDocs, groups, invoices] = await Promise.all([
    Invoice.aggregate<{ months: number[]; years: number[] }>([
      { $match: invoiceVisibilityFilter(session) },
      {
        $group: {
          _id: null,
          months: { $addToSet: { $month: { date: "$tanggalInvoice", timezone: "Asia/Jakarta" } } },
          years: { $addToSet: { $year: { date: "$tanggalInvoice", timezone: "Asia/Jakarta" } } },
        },
      },
    ]),
    session?.role !== "sales" ? Sales.find({ aktif: true }).sort({ nama: 1 }).lean() : Promise.resolve([] as { nama: string }[]),
    Invoice.aggregate<{ _id: { k: InvoiceRowStatus; done: boolean }; n: number; grand: number; sisa: number }>([
      { $match: filter },
      {
        $group: {
          _id: { k: statusKey, done: paidAndShipped },
          n: { $sum: 1 },
          grand: { $sum: "$grandTotal" },
          sisa: { $sum: { $subtract: ["$grandTotal", dpAmount] } },
        },
      },
    ]),
    loadPageInvoices(),
  ]);
  const availableMonths = (periodeAgg[0]?.months ?? []).sort((a, b) => a - b);
  const availableYears = (periodeAgg[0]?.years ?? []).sort((a, b) => b - a);
  const availableSales = salesDocs.map((s) => s.nama);

  const counts: InvoiceListCounts = { semua: 0, unpaid: 0, dp: 0, draft: 0, paid: 0, needs: 0, done: 0 };
  const grand: Record<InvoiceFilterKey, number> = { semua: 0, unpaid: 0, dp: 0, draft: 0, paid: 0 };
  let sisaDp = 0;
  for (const g of groups) {
    counts.semua += g.n;
    counts[g._id.k] += g.n;
    grand.semua += g.grand;
    grand[g._id.k] += g.grand;
    if (g._id.k === "dp") sisaDp += g.sisa;
    if (g._id.k === "paid" && g._id.done) counts.done += g.n;
    else counts.needs += g.n;
  }
  const total = counts[status];
  clampPageOrRedirect("/invoice", sp, page, total, pageSize);
  // "Sudah DP" sums what is still owed (sisa tagihan); every other pill, including "Semua", sums grandTotal.
  const totalNilai = status === "dp" ? sisaDp : grand[status];

  // Pill links keep search/sales/periode, drop page (a new status starts at page 1).
  const pillHrefs = Object.fromEntries(
    (["semua", ...STATUS_KEYS] as InvoiceFilterKey[]).map((key) => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(sp)) if (k !== "page" && k !== "status" && typeof v === "string") params.set(k, v);
      if (key !== "semua") params.set("status", key);
      const qs = params.toString();
      return [key, qs ? `/invoice?${qs}` : "/invoice"];
    })
  ) as Record<InvoiceFilterKey, string>;

  const rows: InvoiceRow[] = invoices.map((inv) => {
    const tanggal = inv.tanggalInvoice ?? inv.get("createdAt");
    const [tglNum, tglMon] = formatDateShortParts(tanggal);
    const status: InvoiceRow["status"] =
      inv.status === "draft" ? "draft" : inv.status === "paid" ? "paid" : inv.dp?.nominal ? "dp" : "unpaid";
    const komisi = inv.items.reduce((s, i) => s + i.komisiSubtotal, 0);

    return {
      id: String(inv._id),
      status,
      tglNum,
      tglMon,
      hariBerjalan: hariBerjalan(tanggal),
      custNama: inv.customer?.nama ?? "—",
      custWhatsapp: inv.customer?.whatsapp ?? undefined,
      nomor: inv.nomor,
      salesNama: inv.sales?.nama ?? "—",
      itemCount: inv.items.length,
      kurir: inv.kurir ?? undefined,
      grandTotal: inv.grandTotal,
      komisi,
      dpPercent: inv.dp?.nominal ? Math.round((inv.dp.nominal / inv.grandTotal) * 100) : undefined,
      sisaTagihan: inv.dp?.nominal ? inv.grandTotal - inv.dp.nominal : undefined,
      dikirim: !!inv.dikirim,
      tanggalDikirimAktual: inv.tanggalDikirimAktual ? inv.tanggalDikirimAktual.toISOString() : undefined,
      tanggal: tanggal.toISOString(),
      hasBukti: !!(inv.dp?.buktiUrl || inv.payment?.buktiUrl),
    };
  });

  return (
    <>
      <PageHeader
        title="Invoice"
        subtitle="Semua tagihan ke pelanggan. Draft belum memotong stok; begitu dikirim, stok dan komisi langsung dihitung."
        actions={<LinkButton href="/katalog">+ Belanja / Buat Invoice</LinkButton>}
      />
      <div className="p-6 md:p-9">
        <InvoiceFilterBar
          search={typeof search === "string" ? search : undefined}
          bulan={bulan}
          tahun={tahun}
          sales={salesFilter}
          status={status === "semua" ? undefined : status}
          availableMonths={availableMonths}
          availableYears={availableYears}
          availableSales={availableSales}
        />

        <InvoiceListClient rows={rows} status={status} counts={counts} totalNilai={totalNilai} pillHrefs={pillHrefs} />
        <Pagination basePath="/invoice" searchParams={sp} page={page} pageSize={pageSize} total={total} />
      </div>
    </>
  );
}

/** "29 Agu" -> ["29", "Agu"] — reuses formatDateShort's own day-number/month-abbrev formatting instead of re-deriving it, just split for the two-line day block. */
function formatDateShortParts(date: Date | string): [string, string] {
  const [day, mon] = formatDateShort(date).split(" ");
  return [day, mon];
}
