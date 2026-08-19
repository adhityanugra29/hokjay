import PageHeader from "@/components/layout/PageHeader";
import SubnavTabs from "@/components/ui/SubnavTabs";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import SortableHeader from "@/components/ui/SortableHeader";
import InsentifOverview from "@/components/insentif/InsentifOverview";
import { currentPeriod, getKomisiPerProduk } from "@/lib/insentif";
import { parseSort, sortRows } from "@/lib/sort";
import { rupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

const SORT_FIELDS = ["namaProduk", "komisiPerItem", "totalTerjual", "totalKomisi"] as const;

export default async function InsentifItemPage({ searchParams }: PageProps<"/insentif/item">) {
  const sp = await searchParams;
  const { period: periodParam } = sp;
  const period = (periodParam as string) || currentPeriod();
  const hasSort = typeof sp.sort === "string" && (SORT_FIELDS as readonly string[]).includes(sp.sort);
  const { field, dir } = parseSort(sp, SORT_FIELDS, "totalKomisi");
  const rowsRaw = await getKomisiPerProduk(period);
  const rows = hasSort ? sortRows(rowsRaw, field, dir) : rowsRaw;

  return (
    <>
      <PageHeader title="Insentif Sales" subtitle="NOMINAL TETAP PER ITEM TERJUAL · DIJUMLAHKAN PER SALES" />
      <div className="p-6 md:p-9">
        <InsentifOverview basePath="/insentif/item" period={period} searchParams={sp} />

        <SubnavTabs
          tabs={[
            { href: "/insentif", label: "Rekap per Personil" },
            { href: "/insentif/item", label: "Rincian per Item" },
            { href: "/insentif/riwayat", label: "Riwayat per Invoice" },
          ]}
        />

        <Panel>
          <PanelHead title="Komisi per jenis produk" />
          <TableScroll>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <SortableHeader label="Produk" sortKey="namaProduk" currentSort={field} currentDir={dir} basePath="/insentif/item" searchParams={sp} />
                  <SortableHeader label="Komisi / Item" sortKey="komisiPerItem" currentSort={field} currentDir={dir} basePath="/insentif/item" searchParams={sp} />
                  <SortableHeader label="Total Terjual" sortKey="totalTerjual" currentSort={field} currentDir={dir} basePath="/insentif/item" searchParams={sp} />
                  <SortableHeader label="Total Komisi Dihasilkan" sortKey="totalKomisi" currentSort={field} currentDir={dir} basePath="/insentif/item" searchParams={sp} />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.namaProduk} className="hover:bg-[#fbfaf5]">
                    <td className="border-b border-line px-5 py-4.5 font-medium">{r.namaProduk}</td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                      {rupiah(r.komisiPerItem)}
                    </td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                      {r.totalTerjual} unit
                    </td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                      {rupiah(r.totalKomisi)}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
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
