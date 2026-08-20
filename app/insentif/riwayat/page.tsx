import PageHeader from "@/components/layout/PageHeader";
import SubnavTabs from "@/components/ui/SubnavTabs";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import SortableHeader from "@/components/ui/SortableHeader";
import InsentifOverview from "@/components/insentif/InsentifOverview";
import PayoutToggle from "@/components/insentif/PayoutToggle";
import { getRiwayatKomisi } from "@/lib/insentif";
import { parseSort, sortRows } from "@/lib/sort";
import { rupiah, formatDateShort } from "@/lib/format";
import { currentJakartaMonthYear } from "@/lib/timezone";

export const dynamic = "force-dynamic";

const SORT_FIELDS = ["nomor", "salesNama", "komisiBaris", "tanggalLunas"] as const;

export default async function InsentifRiwayatPage({ searchParams }: PageProps<"/insentif/riwayat">) {
  const sp = await searchParams;
  const nowJakarta = currentJakartaMonthYear();
  const month = Number(sp.bulan) || nowJakarta.month;
  const year = Number(sp.tahun) || nowJakarta.year;
  const period = `${year}-${String(month).padStart(2, "0")}`;
  const hasSort = typeof sp.sort === "string" && (SORT_FIELDS as readonly string[]).includes(sp.sort);
  const { field, dir } = parseSort(sp, SORT_FIELDS, "tanggalLunas");
  const rowsRaw = await getRiwayatKomisi(period);
  const rows = hasSort ? sortRows(rowsRaw, field, dir) : rowsRaw;

  return (
    <>
      <PageHeader title="Insentif Sales" subtitle="NOMINAL TETAP PER ITEM TERJUAL · DIJUMLAHKAN PER SALES" />
      <div className="p-6 md:p-9">
        <InsentifOverview basePath="/insentif/riwayat" month={month} year={year} currentYear={nowJakarta.year} searchParams={sp} />

        <SubnavTabs
          tabs={[
            { href: "/insentif", label: "Rekap per Personil" },
            { href: "/insentif/item", label: "Rincian per Item" },
            { href: "/insentif/riwayat", label: "Riwayat per Invoice" },
          ]}
        />

        <Panel>
          <PanelHead title="Riwayat komisi per invoice" />
          <TableScroll>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <SortableHeader label="No. Invoice" sortKey="nomor" currentSort={field} currentDir={dir} basePath="/insentif/riwayat" searchParams={sp} />
                  <SortableHeader label="Sales" sortKey="salesNama" currentSort={field} currentDir={dir} basePath="/insentif/riwayat" searchParams={sp} />
                  <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                    Item
                  </th>
                  <SortableHeader label="Komisi Baris" sortKey="komisiBaris" currentSort={field} currentDir={dir} basePath="/insentif/riwayat" searchParams={sp} />
                  <SortableHeader label="Tanggal Lunas" sortKey="tanggalLunas" currentSort={field} currentDir={dir} basePath="/insentif/riwayat" searchParams={sp} />
                  <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                    Pencairan
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.invoiceId} className="hover:bg-[#fbfaf5]">
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{r.nomor}</td>
                    <td className="border-b border-line px-5 py-4.5">{r.salesNama}</td>
                    <td className="border-b border-line px-5 py-4.5">{r.itemLabel}</td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                      {rupiah(r.komisiBaris)}
                    </td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                      {formatDateShort(r.tanggalLunas)}
                    </td>
                    <td className="border-b border-line px-5 py-4.5">
                      <PayoutToggle invoiceId={r.invoiceId} cair={r.komisiCair} />
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center font-mono text-sm text-muted">
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
