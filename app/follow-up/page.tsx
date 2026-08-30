import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import FollowUpStatusBadge from "@/components/dashboard/FollowUpStatusBadge";
import { getFollowUpInvoices, summarizeFollowUpBySales } from "@/lib/dashboard";
import { rupiah, rupiahCompact } from "@/lib/format";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function FollowUpPage() {
  // /follow-up is reachable by a plain "sales" role too (see
  // lib/auth/access.ts's isAllowedPage) — same per-sales privacy applies.
  const session = await getSession();
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
        </Panel>

        <Panel>
          <PanelHead title="Semua invoice perlu follow-up" />
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
                      <FollowUpStatusBadge status={r.status} />
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
                        className="border border-accent px-3 py-1.5 font-sans text-[0.7rem] font-semibold text-accent no-underline hover:bg-accent hover:text-white"
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
        </Panel>
      </div>
    </>
  );
}
