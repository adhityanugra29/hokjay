import Link from "next/link";
import { redirect } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import FollowUpStatusBadge from "@/components/dashboard/FollowUpStatusBadge";
import { MobileFollowUpBySales, MobileFollowUpRows } from "@/components/dashboard/MobileFollowUp";
import TandaiKirimButton, { type CourierOption } from "@/components/invoice/TandaiKirimButton";
import { getFollowUpInvoices, summarizeFollowUpBySales } from "@/lib/dashboard";
import { rupiah, rupiahCompact } from "@/lib/format";
import { getSession } from "@/lib/auth/session";
import { Courier } from "@/models/Courier";
import { dbConnect } from "@/lib/db";

async function getCouriers(): Promise<CourierOption[]> {
  await dbConnect();
  return (await Courier.find().sort({ name: 1 }).lean()).map((c) => ({ _id: String(c._id), name: c.name }));
}

export const dynamic = "force-dynamic";

/**
 * `?view=kirim` (2026-09-19) used to render the "Perlu Dikirim" list here; since
 * TASK-046 (2026-10-22) that list lives at /pengiriman and this URL redirects
 * there. The default view stays the payment follow-up list that Komisi Saya's
 * "Tagih yang tertahan" button links to.
 */
export default async function FollowUpPage({ searchParams }: PageProps<"/follow-up">) {
  // /follow-up is reachable by a plain "sales" role too (see
  // lib/auth/access.ts's isAllowedPage) — same per-sales privacy applies.
  const session = await getSession();
  const sp = await searchParams;

  // The old "Perlu Dikirim" view moved to its own page (TASK-046); keep the
  // URL working for bookmarks and any lingering link.
  if (sp.view === "kirim") redirect("/pengiriman");

  const rows = await getFollowUpInvoices(session);
  const bySales = summarizeFollowUpBySales(rows);
  const couriers = await getCouriers();

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
                      <div className="flex flex-wrap items-center gap-1.5">
                        <FollowUpStatusBadge status={r.hasDp ? "dp" : r.status} />
                        {r.dikirim && (
                          <span className="whitespace-nowrap rounded-full border border-emerald-500 bg-emerald-50 px-2 py-0.5 font-mono text-[0.62rem] font-bold text-emerald-700">
                            ✓ Dikirim
                          </span>
                        )}
                      </div>
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
                      <div className="flex flex-wrap justify-end gap-2">
                        {r.status !== "draft" && !r.dikirim && (
                          <TandaiKirimButton
                            invoiceId={r.invoiceId}
                            nomor={r.nomor}
                            customerNama={r.customerNama}
                            couriers={couriers}
                            currentKurir={r.kurir}
                          />
                        )}
                        <Link
                          href={r.status === "draft" ? `/invoice/${r.invoiceId}/ubah` : `/invoice/${r.invoiceId}`}
                          className="border border-accent px-3 py-1.5 font-sans text-[0.7rem] font-semibold text-accent-700 no-underline hover:bg-accent hover:text-ink"
                        >
                          {r.status === "draft" ? "Lanjutkan" : "Lihat"}
                        </Link>
                      </div>
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
