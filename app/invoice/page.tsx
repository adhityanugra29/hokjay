import PageHeader from "@/components/layout/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { redirect } from "next/navigation";
import InvoiceListClient, { type FilterKey, type InvoiceRow, type InvoiceStats } from "@/components/invoice/InvoiceListClient";
import InvoiceFilterBar from "@/components/invoice/InvoiceFilterBar";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Sales } from "@/models/Sales";
import { formatDateShort } from "@/lib/format";
import { currentJakartaMonthYear, jakartaMonthRange, jakartaYearRange } from "@/lib/timezone";
import { getSession } from "@/lib/auth/session";
import { invoiceVisibilityFilter } from "@/lib/invoice-visibility";

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
  // The four reads are independent, so they run together (one round trip of latency instead of four in a row). Sales options are only
  // fetched for non-"sales" sessions (see salesFilter above): the roster, not just names on invoices, so a rep with no invoices still shows up.
  const statusFilter: FilterKey = FILTER_KEYS.includes(sp.status as FilterKey) ? (sp.status as FilterKey) : "semua";
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);
  const selesaiExpr = { $and: [{ $eq: ["$status", "paid"] }, { $eq: ["$dikirim", true] }] };
  const dpNominal = { $ifNull: ["$dp.nominal", 0] };

  // Status counts/totals come from one grouped query over the whole filtered set; the list itself only loads one page (PAGE_SIZE rows, already shaped by
  // $project so each row's items[] never leaves Mongo). Under "Semua", rows still needing action sort before finished ones, matching the grouped view.
  const [periodeAgg, salesDocs, statAgg, invoices] = await Promise.all([
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
    Invoice.aggregate<{ _id: { status: InvoiceRow["status"]; selesai: boolean }; count: number; total: number; sisa: number }>([
      { $match: filter },
      {
        $group: {
          _id: {
            status: {
              $switch: {
                branches: [
                  { case: { $eq: ["$status", "draft"] }, then: "draft" },
                  { case: { $eq: ["$status", "paid"] }, then: "paid" },
                  { case: { $gt: [dpNominal, 0] }, then: "dp" },
                ],
                default: "unpaid",
              },
            },
            selesai: selesaiExpr,
          },
          count: { $sum: 1 },
          total: { $sum: "$grandTotal" },
          sisa: { $sum: { $subtract: ["$grandTotal", dpNominal] } },
        },
      },
    ]),
    Invoice.aggregate<RawInvoiceRow>([
      { $match: { ...filter, ...STATUS_MATCH[statusFilter] } },
      {
        $project: {
          nomor: 1,
          status: 1,
          tanggalInvoice: 1,
          createdAt: 1,
          "customer.nama": 1,
          "customer.whatsapp": 1,
          "sales.nama": 1,
          kurir: 1,
          grandTotal: 1,
          "dp.nominal": 1,
          "dp.buktiUrl": 1,
          "payment.buktiUrl": 1,
          dikirim: 1,
          tanggalDikirimAktual: 1,
          komisi: { $sum: "$items.komisiSubtotal" },
          itemCount: { $size: { $ifNull: ["$items", []] } },
          selesai: { $cond: [selesaiExpr, 1, 0] },
        },
      },
      { $sort: statusFilter === "semua" ? { selesai: 1, createdAt: -1, _id: -1 } : { createdAt: -1, _id: -1 } },
      { $skip: (page - 1) * PAGE_SIZE },
      { $limit: PAGE_SIZE },
    ]),
  ]);
  const availableMonths = (periodeAgg[0]?.months ?? []).sort((a, b) => a - b);
  const availableYears = (periodeAgg[0]?.years ?? []).sort((a, b) => b - a);
  const availableSales = salesDocs.map((s) => s.nama);

  const stats: InvoiceStats = {
    semua: { count: 0, nilai: 0 },
    unpaid: { count: 0, nilai: 0 },
    dp: { count: 0, nilai: 0 },
    draft: { count: 0, nilai: 0 },
    paid: { count: 0, nilai: 0 },
  };
  let selesaiCount = 0;
  for (const g of statAgg) {
    const s = stats[g._id.status];
    s.count += g.count;
    s.nilai += g._id.status === "dp" ? g.sisa : g.total; // "Sudah DP" sums the remaining sisa tagihan; every other pill sums grandTotal
    stats.semua.count += g.count;
    stats.semua.nilai += g.total;
    if (g._id.selesai) selesaiCount += g.count;
  }
  const totalPages = Math.max(1, Math.ceil(stats[statusFilter].count / PAGE_SIZE));
  if (page > totalPages) {
    // Filter/search changed while on a later page: land on the last page that exists instead of an empty one.
    const qs = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
    qs.set("page", String(totalPages));
    redirect(`/invoice?${qs.toString()}`);
  }

  const rows: InvoiceRow[] = invoices.map((inv) => {
    const tanggal = inv.tanggalInvoice ?? inv.createdAt;
    const [tglNum, tglMon] = formatDateShortParts(tanggal);
    const status: InvoiceRow["status"] =
      inv.status === "draft" ? "draft" : inv.status === "paid" ? "paid" : inv.dp?.nominal ? "dp" : "unpaid";

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
      itemCount: inv.itemCount,
      kurir: inv.kurir ?? undefined,
      grandTotal: inv.grandTotal,
      komisi: inv.komisi,
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
          availableMonths={availableMonths}
          availableYears={availableYears}
          availableSales={availableSales}
        />

        <InvoiceListClient
          rows={rows}
          filter={statusFilter}
          stats={stats}
          selesaiCount={selesaiCount}
          page={page}
          totalPages={totalPages}
          query={{ search: typeof search === "string" ? search : undefined, bulan: sp.bulan, tahun: sp.tahun, sales: salesFilter }}
        />
      </div>
    </>
  );
}

const PAGE_SIZE = 15;
const FILTER_KEYS: FilterKey[] = ["semua", "unpaid", "dp", "draft", "paid"];

// Mirrors the row-status rule in the map above ("unpaid" = anything not draft/paid and without a DP).
const STATUS_MATCH: Record<FilterKey, Record<string, unknown>> = {
  semua: {},
  unpaid: { status: { $nin: ["draft", "paid"] }, "dp.nominal": { $not: { $gt: 0 } } },
  dp: { status: { $nin: ["draft", "paid"] }, "dp.nominal": { $gt: 0 } },
  draft: { status: "draft" },
  paid: { status: "paid" },
};

/** Shape of one $project-ed row from the list aggregation (no items[] — komisi/itemCount are computed in Mongo). */
interface RawInvoiceRow {
  _id: unknown;
  nomor: string;
  status?: string;
  tanggalInvoice?: Date;
  createdAt: Date;
  customer?: { nama?: string; whatsapp?: string };
  sales?: { nama?: string };
  kurir?: string;
  grandTotal: number;
  dp?: { nominal?: number; buktiUrl?: string };
  payment?: { buktiUrl?: string };
  dikirim?: boolean;
  tanggalDikirimAktual?: Date;
  komisi: number;
  itemCount: number;
}

/** "29 Agu" -> ["29", "Agu"] — reuses formatDateShort's own day-number/month-abbrev formatting instead of re-deriving it, just split for the two-line day block. */
function formatDateShortParts(date: Date | string): [string, string] {
  const [day, mon] = formatDateShort(date).split(" ");
  return [day, mon];
}
