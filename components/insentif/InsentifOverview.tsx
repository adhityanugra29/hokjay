import PeriodFilterPills from "@/components/ui/PeriodFilterPills";
import StatCard from "@/components/ui/StatCard";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import RankBadge from "@/components/ui/RankBadge";
import SortableHeader from "@/components/ui/SortableHeader";
import { periodOptions, getSalesRanking } from "@/lib/insentif";
import { rupiah } from "@/lib/format";
import { parseSort, sortRows } from "@/lib/sort";

const SORT_FIELDS = ["salesNama", "qty", "totalPenjualan", "totalKomisi"] as const;

export default async function InsentifOverview({
  basePath,
  period,
  searchParams,
}: {
  basePath: string;
  period: string;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const sp = searchParams ?? {};
  const hasSort = typeof sp.ranksort === "string" && (SORT_FIELDS as readonly string[]).includes(sp.ranksort);
  const { field, dir } = parseSort(sp, SORT_FIELDS, "totalKomisi", "rank");
  const rankingRaw = await getSalesRanking(period);
  const ranking = hasSort ? sortRows(rankingRaw, field, dir) : rankingRaw;

  const totalKomisi = ranking.reduce((s, r) => s + r.totalKomisi, 0);
  const sudahCair = ranking.reduce((s, r) => s + r.komisiCairCount, 0);
  const belumCair = ranking.reduce((s, r) => s + r.komisiBelumCairCount, 0);
  const top = ranking[0];

  return (
    <>
      <PeriodFilterPills basePath={basePath} periods={periodOptions()} active={period} />

      <div className="mb-5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard label="Total komisi bulan ini" value={rupiah(totalKomisi)} accent="teal" delta={`dari ${ranking.length} sales aktif`} deltaTone="up" />
        <StatCard label="Invoice sudah dicairkan" value={String(sudahCair)} accent="violet" deltaTone="violet" delta="invoice komisi cair" />
        <StatCard label="Invoice belum dicairkan" value={String(belumCair)} accent="gold" deltaTone="warn" delta="menunggu pembayaran" />
        <StatCard
          label="Top performer"
          value={top?.salesNama ?? "—"}
          accent="gold"
          deltaTone="gold"
          delta={top ? `${rupiah(top.totalKomisi)} komisi` : "belum ada data"}
        />
      </div>

      <Panel className="mb-5">
        <PanelHead title="🏆 Ranking Sales" />
        <TableScroll>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                  Rank
                </th>
                <SortableHeader label="Sales" sortKey="salesNama" currentSort={field} currentDir={dir} basePath={basePath} searchParams={sp} paramPrefix="rank" />
                <SortableHeader label="Qty Terjual" sortKey="qty" currentSort={field} currentDir={dir} basePath={basePath} searchParams={sp} paramPrefix="rank" />
                <SortableHeader label="Total Penjualan" sortKey="totalPenjualan" currentSort={field} currentDir={dir} basePath={basePath} searchParams={sp} paramPrefix="rank" />
                <SortableHeader label="Total Insentif" sortKey="totalKomisi" currentSort={field} currentDir={dir} basePath={basePath} searchParams={sp} paramPrefix="rank" />
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, idx) => (
                <tr key={r.salesNama} className="hover:bg-[#fbfaf5]">
                  <td className="border-b border-line px-5 py-4.5">
                    <RankBadge rank={idx + 1} />
                  </td>
                  <td className="border-b border-line px-5 py-4.5 font-medium">{r.salesNama}</td>
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{r.qty} unit</td>
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                    {rupiah(r.totalPenjualan)}
                  </td>
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem] font-medium text-moss-deep">
                    {rupiah(r.totalKomisi)}
                  </td>
                </tr>
              ))}
              {ranking.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center font-mono text-sm text-muted">
                    Belum ada penjualan lunas pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableScroll>
      </Panel>
    </>
  );
}
