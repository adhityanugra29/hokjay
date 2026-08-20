import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import SubnavTabs from "@/components/ui/SubnavTabs";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import { RowActionLink } from "@/components/ui/RowAction";
import { getUnpaidCommissionBySales } from "@/lib/insentif";
import { rupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Landing page for Finance: who's still owed sales commission, and a way
 * into paying it off (per sales, batched across their unpaid invoices,
 * with an optional proof-of-transfer upload). See /insentif/bayar/[nama].
 */
export default async function InsentifBayarPage() {
  const rows = await getUnpaidCommissionBySales();
  const totalOutstanding = rows.reduce((s, r) => s + r.totalKomisi, 0);

  return (
    <>
      <PageHeader
        title="Pembayaran Komisi"
        subtitle="UNTUK TIM FINANCE · BAYAR KOMISI SALES PER ORANG ATAU SEKALIGUS"
      />
      <div className="p-6 md:p-9">
        <SubnavTabs
          tabs={[
            { href: "/insentif", label: "Rekap per Personil" },
            { href: "/insentif/item", label: "Rincian per Item" },
            { href: "/insentif/riwayat", label: "Riwayat per Invoice" },
            { href: "/insentif/bayar", label: "Bayar Komisi" },
          ]}
        />

        <div className="mb-5 border border-line bg-[#f7f5ee] p-5">
          <div className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">
            Total komisi belum cair (semua sales)
          </div>
          <div className="mt-1 text-[1.6rem] font-extrabold text-accent-700">{rupiah(totalOutstanding)}</div>
        </div>

        <Panel>
          <PanelHead title="Komisi belum cair per sales" />
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
                    Total Komisi Belum Cair
                  </th>
                  <th className="border-b border-line px-5 py-4" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.salesNama} className="hover:bg-[#fbfaf5]">
                    <td className="border-b border-line px-5 py-4.5 font-medium">{r.salesNama}</td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{r.invoiceCount} invoice</td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem] font-medium text-accent-700">
                      {rupiah(r.totalKomisi)}
                    </td>
                    <td className="border-b border-line px-5 py-4.5">
                      <RowActionLink href={`/insentif/bayar/${encodeURIComponent(r.salesNama)}`}>
                        Bayar →
                      </RowActionLink>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center font-mono text-sm text-muted">
                      Semua komisi sudah cair. 🎉
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableScroll>
        </Panel>

        <div className="mt-3 font-mono text-[0.72rem] text-muted">
          Butuh lihat siapa yang sudah dibayar dan buktinya?{" "}
          <Link href="/insentif/riwayat" className="text-accent underline underline-offset-2">
            Cek Riwayat per Invoice
          </Link>
          .
        </div>
      </div>
    </>
  );
}
