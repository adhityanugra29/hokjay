import PageHeader from "@/components/layout/PageHeader";
import SubnavTabs from "@/components/ui/SubnavTabs";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import SortableHeader from "@/components/ui/SortableHeader";
import InsentifOverview from "@/components/insentif/InsentifOverview";
import Pill from "@/components/ui/Pill";
import { getSalesRanking } from "@/lib/insentif";
import { parseSort, sortRows } from "@/lib/sort";
import { rupiah } from "@/lib/format";
import { currentJakartaMonthYear } from "@/lib/timezone";

export const dynamic = "force-dynamic";

const SORT_FIELDS = ["salesNama", "qty", "totalKomisi"] as const;

export default async function InsentifPage({ searchParams }: PageProps<"/insentif">) {
  const sp = await searchParams;
  const nowJakarta = currentJakartaMonthYear();
  const month = Number(sp.bulan) || nowJakarta.month;
  const year = Number(sp.tahun) || nowJakarta.year;
  const period = `${year}-${String(month).padStart(2, "0")}`;
  const hasSort = typeof sp.sort === "string" && (SORT_FIELDS as readonly string[]).includes(sp.sort);
  const { field, dir } = parseSort(sp, SORT_FIELDS, "totalKomisi");
  const rankingRaw = await getSalesRanking(period);
  const ranking = hasSort ? sortRows(rankingRaw, field, dir) : rankingRaw;

  return (
    <>
      <PageHeader title="Insentif Sales" subtitle="NOMINAL TETAP PER ITEM TERJUAL · DIJUMLAHKAN PER SALES" />
      <div className="p-6 md:p-9">
        <InsentifOverview basePath="/insentif" month={month} year={year} currentYear={nowJakarta.year} searchParams={sp} />

        <SubnavTabs
          tabs={[
            { href: "/insentif", label: "Rekap per Personil" },
            { href: "/insentif/item", label: "Rincian per Item" },
            { href: "/insentif/riwayat", label: "Riwayat per Invoice" },
          ]}
        />

        <Panel className="mb-6">
          <PanelHead title="Rekap komisi per sales (dijumlahkan dari item terjual lunas)" />
          <TableScroll>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <SortableHeader label="Sales" sortKey="salesNama" currentSort={field} currentDir={dir} basePath="/insentif" searchParams={sp} />
                  <SortableHeader label="Item Terjual (lunas)" sortKey="qty" currentSort={field} currentDir={dir} basePath="/insentif" searchParams={sp} />
                  <SortableHeader label="Total Komisi" sortKey="totalKomisi" currentSort={field} currentDir={dir} basePath="/insentif" searchParams={sp} />
                  <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                    Status Pencairan
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r) => (
                  <tr key={r.salesNama} className="hover:bg-[#fbfaf5]">
                    <td className="border-b border-line px-5 py-4.5 font-medium">{r.salesNama}</td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{r.qty} item</td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                      {rupiah(r.totalKomisi)}
                    </td>
                    <td className="border-b border-line px-5 py-4.5">
                      {r.komisiBelumCairCount === 0 ? (
                        <Pill variant="paid">Semua Cair</Pill>
                      ) : r.komisiCairCount === 0 ? (
                        <Pill variant="unpaid">Belum Dicairkan</Pill>
                      ) : (
                        <Pill variant="low">{r.komisiCairCount} cair · {r.komisiBelumCairCount} belum</Pill>
                      )}
                    </td>
                  </tr>
                ))}
                {ranking.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center font-mono text-sm text-muted">
                      Belum ada data.
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
