import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import FollowUpStatusBadge from "@/components/dashboard/FollowUpStatusBadge";
import { MobileFollowUpBySales, MobileFollowUpRows } from "@/components/dashboard/MobileFollowUp";
import MobileShippingRows from "@/components/dashboard/MobileShippingRows";
import { getFollowUpInvoices, getShippingPriorityInvoices, summarizeFollowUpBySales, shippingUrgency } from "@/lib/dashboard";
import { rupiah, rupiahCompact } from "@/lib/format";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * `?view=kirim` (2026-09-19) — reached from Beranda's "Perlu Dikirim"
 * widget's "lihat semua" link, per the user's request ("tolong tampilkan
 * semua yang ingin harus dikirim, lalu tambahkan juga label... Dikirim
 * Besok, Terlambat xx Hari, Hari ini"). Kept as a query-param branch on
 * this SAME page rather than a new route, because the default view is
 * still linked from Komisi Saya's "Tagih yang tertahan" button with a
 * genuinely different, payment-collection meaning (unpaid-only, no paid
 * invoices) — the two can't just be merged into one framing without
 * making that button's copy wrong.
 */
export default async function FollowUpPage({ searchParams }: PageProps<"/follow-up">) {
  // /follow-up is reachable by a plain "sales" role too (see
  // lib/auth/access.ts's isAllowedPage) — same per-sales privacy applies.
  const session = await getSession();
  const sp = await searchParams;

  if (sp.view === "kirim") {
    return <PerluDikirimView session={session} />;
  }

  const rows = await getFollowUpInvoices(session);
  const bySales = summarizeFollowUpBySales(rows);

  const totalNilai = rows.reduce((s, r) => s + r.sisaTagihan, 0);
  const totalKomisi = rows.reduce((s, r) => s + r.komisiPotensial, 0);
  const unpaidCount = rows.filter((r) => r.status === "unpaid").length;
  const draftCount = rows.filter((r) => r.status === "draft").length;

  return (
    <>
      <PageHeader title="Follow-up Penjualan" subtitle="SEMUA INVOICE BELUM LUNAS & DRAFT · TOTAL PER SALES" />
      <div className="p-6 md:p-9">
        <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <StatCard label="Invoice Perlu Follow-up" value={String(rows.length)} accent="teal" deltaTone="up" delta={`${unpaidCount} belum lunas · ${draftCount} draft`} />
          <StatCard label="Total Nilai Penjualan" value={rupiahCompact(totalNilai)} accent="gold" deltaTone="gold" delta="belum closing" />
          <StatCard label="Total Komisi Potensial" value={rupiahCompact(totalKomisi)} accent="violet" deltaTone="violet" delta="kalau semua closing & lunas" />
          <StatCard label="Sales Terlibat" value={String(bySales.length)} accent="clay" deltaTone="warn" delta="punya follow-up aktif" />
        </div>

        <Panel className="mb-6">
          <PanelHead title="Total per sales" />
          {/* Mobile card list below md; the fixed-column table takes over
              at md+ — tables were the only way to see this data, per the
              user's request 2026-08-30 ("mereka mobile oriented"). */}
          <MobileFollowUpBySales bySales={bySales} />
          <div className="hidden md:block">
          <TableScroll>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                    Sales
                  </th>
                  <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                    Jumlah Invoice
                  </th>
                  <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                    Total Nilai
                  </th>
                  <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                    Total Komisi Potensial
                  </th>
                </tr>
              </thead>
              <tbody>
                {bySales.map((s) => (
                  <tr key={s.salesNama} className="hover:bg-[#fbfaf5]">
                    <td className="border-b border-line px-5 py-4.5 font-medium">{s.salesNama}</td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{s.invoiceCount} invoice</td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{rupiah(s.totalNilai)}</td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem] font-semibold text-accent-700">
                      {rupiah(s.totalKomisiPotensial)}
                    </td>
                  </tr>
                ))}
                {bySales.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center font-mono text-sm text-muted">
                      Tidak ada invoice yang perlu ditindak.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableScroll>
          </div>
        </Panel>

        <Panel>
          <PanelHead title="Semua invoice perlu follow-up" />
          <MobileFollowUpRows rows={rows} />
          <div className="hidden md:block">
          <TableScroll>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                    No. Invoice
                  </th>
                  <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                    Status
                  </th>
                  <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                    Pelanggan
                  </th>
                  <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                    Sales
                  </th>
                  <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                    Nilai
                  </th>
                  <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                    Komisi Potensial
                  </th>
                  <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                    Berjalan
                  </th>
                  <th className="border-b border-line px-5 py-4" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.invoiceId} className="hover:bg-[#fbfaf5]">
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{r.nomor}</td>
                    <td className="border-b border-line px-5 py-4.5">
                      <FollowUpStatusBadge status={r.hasDp ? "dp" : r.status} />
                    </td>
                    <td className="border-b border-line px-5 py-4.5 font-medium">{r.customerNama}</td>
                    <td className="border-b border-line px-5 py-4.5">{r.salesNama}</td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                      {rupiah(r.sisaTagihan)}
                      {r.sisaTagihan !== r.grandTotal && (
                        <div className="mt-0.5 text-[0.68rem] text-muted">sudah DP, dari {rupiah(r.grandTotal)}</div>
                      )}
                    </td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem] font-medium text-accent-700">
                      {rupiah(r.komisiPotensial)}
                    </td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem] text-muted">
                      {r.hariBerjalan} hari
                    </td>
                    <td className="border-b border-line px-5 py-4.5">
                      <Link
                        href={r.status === "draft" ? `/invoice/${r.invoiceId}/ubah` : `/invoice/${r.invoiceId}`}
                        className="border border-accent px-3 py-1.5 font-sans text-[0.7rem] font-semibold text-accent-700 no-underline hover:bg-accent hover:text-ink"
                      >
                        {r.status === "draft" ? "Lanjutkan" : "Lihat"}
                      </Link>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center font-mono text-sm text-muted">
                      Tidak ada invoice yang perlu ditindak. 🎉
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableScroll>
          </div>
        </Panel>
      </div>
    </>
  );
}

/** The "lihat semua" destination for Beranda's "Perlu Dikirim" widget — see the `?view=kirim` doc comment above. Same source/sort as the widget (getShippingPriorityInvoices: Lunas → Sudah DP → Belum Bayar/Draft, then shipping urgency within each tier), just the full list instead of a 6-row teaser. */
async function PerluDikirimView({ session }: { session: Awaited<ReturnType<typeof getSession>> }) {
  const rows = await getShippingPriorityInvoices(session);
  const overdueCount = rows.filter((r) => shippingUrgency(r.tanggalKirim).tone === "overdue").length;
  const todayCount = rows.filter((r) => shippingUrgency(r.tanggalKirim).tone === "today").length;
  const lunasCount = rows.filter((r) => r.status === "paid").length;

  return (
    <>
      <PageHeader title="Perlu Dikirim" subtitle="SEMUA INVOICE YANG PERLU DIKIRIM · LUNAS → SUDAH DP → BELUM BAYAR" />
      <div className="p-6 md:p-9">
        <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <StatCard label="Perlu Dikirim" value={String(rows.length)} accent="teal" deltaTone="up" delta="total invoice" />
          <StatCard label="Terlambat Kirim" value={String(overdueCount)} accent="clay" deltaTone="warn" delta="lewat tanggal kirim" />
          <StatCard label="Kirim Hari Ini" value={String(todayCount)} accent="gold" deltaTone="gold" delta="jatuh hari ini" />
          <StatCard label="Sudah Lunas" value={String(lunasCount)} accent="violet" deltaTone="violet" delta="tinggal kirim" />
        </div>

        <Panel>
          <PanelHead title="Semua invoice perlu dikirim" />
          <MobileShippingRows rows={rows} />
          <div className="hidden md:block">
            <TableScroll>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                      No. Invoice
                    </th>
                    <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                      Status
                    </th>
                    <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                      Pelanggan
                    </th>
                    <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                      Sales
                    </th>
                    <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                      Kapan Kirim
                    </th>
                    <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                      Nilai
                    </th>
                    <th className="border-b border-line px-5 py-4" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const urgency = shippingUrgency(r.tanggalKirim);
                    return (
                      <tr key={r.invoiceId} className="hover:bg-[#fbfaf5]">
                        <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{r.nomor}</td>
                        <td className="border-b border-line px-5 py-4.5">
                          <FollowUpStatusBadge status={r.status === "paid" ? "paid" : r.hasDp ? "dp" : r.status} />
                        </td>
                        <td className="border-b border-line px-5 py-4.5 font-medium">{r.customerNama}</td>
                        <td className="border-b border-line px-5 py-4.5">{r.salesNama}</td>
                        <td
                          className={`border-b border-line px-5 py-4.5 font-mono text-[0.8rem] font-semibold ${
                            urgency.tone === "overdue"
                              ? "text-red-600"
                              : urgency.tone === "today"
                                ? "text-accent-700"
                                : "text-ink"
                          }`}
                        >
                          {urgency.label}
                        </td>
                        <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                          {r.status === "paid" ? "Lunas" : rupiah(r.sisaTagihan)}
                        </td>
                        <td className="border-b border-line px-5 py-4.5">
                          <Link
                            href={r.status === "draft" ? `/invoice/${r.invoiceId}/ubah` : `/invoice/${r.invoiceId}`}
                            className="border border-accent px-3 py-1.5 font-sans text-[0.7rem] font-semibold text-accent-700 no-underline hover:bg-accent hover:text-ink"
                          >
                            {r.status === "draft" ? "Lanjutkan" : "Lihat"}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center font-mono text-sm text-muted">
                        Tidak ada invoice yang perlu dikirim. 🎉
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableScroll>
          </div>
        </Panel>
      </div>
    </>
  );
}
