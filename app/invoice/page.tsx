import PageHeader from "@/components/layout/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import InvoiceListClient, { type InvoiceRow } from "@/components/invoice/InvoiceListClient";
import InvoiceFilterBar from "@/components/invoice/InvoiceFilterBar";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Sales } from "@/models/Sales";
import { Courier } from "@/models/Courier";
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
  // Couriers feed TandaiKirimButton's Kurir select.
  const [periodeAgg, salesDocs, invoices, courierDocs] = await Promise.all([
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
    Invoice.find(filter).sort({ createdAt: -1 }),
    Courier.find().sort({ name: 1 }).lean(),
  ]);
  const availableMonths = (periodeAgg[0]?.months ?? []).sort((a, b) => a - b);
  const availableYears = (periodeAgg[0]?.years ?? []).sort((a, b) => b - a);
  const availableSales = salesDocs.map((s) => s.nama);
  const couriers = courierDocs.map((c) => ({ _id: String(c._id), name: c.name }));

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
          availableMonths={availableMonths}
          availableYears={availableYears}
          availableSales={availableSales}
        />

        <InvoiceListClient rows={rows} couriers={couriers} />
      </div>
    </>
  );
}

/** "29 Agu" -> ["29", "Agu"] — reuses formatDateShort's own day-number/month-abbrev formatting instead of re-deriving it, just split for the two-line day block. */
function formatDateShortParts(date: Date | string): [string, string] {
  const [day, mon] = formatDateShort(date).split(" ");
  return [day, mon];
}
