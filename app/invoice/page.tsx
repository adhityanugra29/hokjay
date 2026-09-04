import PageHeader from "@/components/layout/PageHeader";
import { SearchInput } from "@/components/ui/Panel";
import { LinkButton } from "@/components/ui/Button";
import InvoiceListClient, { type InvoiceRow } from "@/components/invoice/InvoiceListClient";
import InvoicePeriodFilter from "@/components/invoice/InvoicePeriodFilter";
import type { InvoicePrintData } from "@/components/invoice/InvoicePrintDoc";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Sales } from "@/models/Sales";
import { formatDateShort } from "@/lib/format";
import { currentJakartaMonthYear, jakartaMonthRange, jakartaYearRange } from "@/lib/timezone";
import { MONTH_NAMES } from "@/lib/constants";
import { getSession } from "@/lib/auth/session";
import { invoiceVisibilityFilter } from "@/lib/invoice-visibility";

export const dynamic = "force-dynamic";

function hariBerjalan(from: Date | string) {
  return Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 86_400_000));
}

/**
 * Invoice list — one flat list filtered through a pill toggle (+ the stat
 * cards double as filter shortcuts), NOT stacked into separate sections.
 * Per the user's request 2026-09-04, which explicitly reversed the earlier
 * "3 sections" version ("kamu jangan pisah itu berdasarkan line...
 * seharusnya kamu grouping dan ada semacam button tambahan"). All the
 * actual grouping/filtering/Preview-drawer state lives in
 * InvoiceListClient.tsx — this page just fetches and shapes the data.
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

  // "Lunas {month}" stat always reflects the real current month regardless
  // of the periode filter below — computed against the visibility+search
  // filter only (not yet narrowed to a periode), so picking a different
  // periode below never changes this number.
  const nowJakarta = currentJakartaMonthYear();
  const thisMonth = jakartaMonthRange(nowJakarta.year, nowJakarta.month);
  const paidThisMonthCount = await Invoice.countDocuments({
    ...filter,
    status: "paid",
    tanggalInvoice: { $gte: thisMonth.from, $lt: thisMonth.to },
  });

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
  const periodeAgg = await Invoice.aggregate<{ months: number[]; years: number[] }>([
    { $match: invoiceVisibilityFilter(session) },
    {
      $group: {
        _id: null,
        months: { $addToSet: { $month: { date: "$tanggalInvoice", timezone: "Asia/Jakarta" } } },
        years: { $addToSet: { $year: { date: "$tanggalInvoice", timezone: "Asia/Jakarta" } } },
      },
    },
  ]);
  const availableMonths = (periodeAgg[0]?.months ?? []).sort((a, b) => a - b);
  const availableYears = (periodeAgg[0]?.years ?? []).sort((a, b) => b - a);

  const invoices = await Invoice.find(filter).sort({ createdAt: -1 });

  // Live phone-number lookup for the Preview drawer's document footer —
  // same reasoning as /invoice/[id]'s own salesNomorHp (a number changing
  // should show up on invoices viewed afterward, unlike the snapshot
  // fields that deliberately freeze at booking time). Batched once for
  // every sales name on this page, same pattern as app/payroll/page.tsx.
  const salesNames = [...new Set(invoices.map((i) => i.sales?.nama).filter((n): n is string => !!n))];
  const salesDocs = await Sales.find({ nama: { $in: salesNames } }).lean();
  const salesPhoneByNama = new Map(salesDocs.map((s) => [s.nama, s.nomorHp ?? undefined]));

  const rows: InvoiceRow[] = invoices.map((inv) => {
    const tanggal = inv.tanggalInvoice ?? inv.get("createdAt");
    const [tglNum, tglMon] = formatDateShortParts(tanggal);
    const status: InvoiceRow["status"] =
      inv.status === "draft" ? "draft" : inv.status === "paid" ? "paid" : inv.dp?.nominal ? "dp" : "unpaid";
    const komisi = inv.items.reduce((s, i) => s + i.komisiSubtotal, 0);

    const printData: InvoicePrintData = {
      nomor: inv.nomor,
      tanggal: tanggal.toISOString(),
      customerNama: inv.customer?.nama ?? "—",
      customerWhatsapp: inv.customer?.whatsapp ?? undefined,
      shipAddress: inv.shipAddress ?? undefined,
      tanggalKirim: inv.tanggalKirim ? inv.tanggalKirim.toISOString() : undefined,
      kurir: inv.kurir ?? undefined,
      salesNama: inv.sales?.nama ?? "—",
      salesNomorHp: inv.sales?.nama ? salesPhoneByNama.get(inv.sales.nama) : undefined,
      items: inv.items.map((item) => ({
        namaSnapshot: item.namaSnapshot,
        dimensiSnapshot: item.dimensiSnapshot ?? undefined,
        qty: item.qty,
        hargaJual: item.hargaJual,
        diskonPerUnit: item.diskonPerUnit ?? 0,
        subtotal: item.subtotal,
        isFlashSale: item.isFlashSale ?? false,
        hargaRekomendasiSnapshot: item.hargaRekomendasiSnapshot ?? undefined,
      })),
      subtotalProduk: inv.subtotalProduk,
      ongkosKirim: inv.ongkosKirim ?? 0,
      grandTotal: inv.grandTotal,
      dpNominal: inv.dp?.nominal ?? undefined,
      dpTanggal: inv.dp?.tanggal ? inv.dp.tanggal.toISOString() : undefined,
    };

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
      printData,
    };
  });

  const totalPiutang = rows
    .filter((r) => r.status === "unpaid" || r.status === "dp")
    .reduce((s, r) => s + (r.sisaTagihan ?? r.grandTotal), 0);

  return (
    <>
      <PageHeader
        title="Invoice"
        subtitle="Semua tagihan ke pelanggan. Draft belum memotong stok; begitu dikirim, stok dan komisi langsung dihitung."
        actions={<LinkButton href="/katalog">+ Belanja / Buat Invoice</LinkButton>}
      />
      <div className="p-6 md:p-9">
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl bg-panel px-4 py-3.5 shadow-sm">
          <form className="flex items-center">
            {/* Hidden bulan/tahun so submitting search (native GET) never
                drops whatever periode is currently selected — a plain
                <form> only sends its own named fields, dropping every
                other URL param otherwise. */}
            {bulan ? <input type="hidden" name="bulan" value={bulan} /> : null}
            {tahun ? <input type="hidden" name="tahun" value={tahun} /> : null}
            <SearchInput name="search" defaultValue={search as string} placeholder="Cari no. invoice atau pelanggan..." />
          </form>
          <InvoicePeriodFilter bulan={bulan} tahun={tahun} availableMonths={availableMonths} availableYears={availableYears} />
        </div>

        <InvoiceListClient
          rows={rows}
          totalPiutang={totalPiutang}
          paidThisMonthCount={paidThisMonthCount}
          monthLabel={MONTH_NAMES[nowJakarta.month - 1]}
        />
      </div>
    </>
  );
}

/** "29 Agu" -> ["29", "Agu"] — reuses formatDateShort's own day-number/month-abbrev formatting instead of re-deriving it, just split for the two-line day block. */
function formatDateShortParts(date: Date | string): [string, string] {
  const [day, mon] = formatDateShort(date).split(" ");
  return [day, mon];
}
