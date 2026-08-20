import { Panel, PanelHead } from "@/components/ui/Panel";
import PeriodPicker from "@/components/ui/PeriodPicker";
import { getLabaRugi } from "@/lib/akuntansi";
import { rupiah } from "@/lib/format";
import { currentJakartaMonthYear, jakartaMonthRange } from "@/lib/timezone";
import { MONTH_NAMES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function LabaRugiPage({ searchParams }: PageProps<"/akuntansi/laba-rugi">) {
  const sp = await searchParams;
  const nowJakarta = currentJakartaMonthYear();
  const month = Number(sp.bulan) || nowJakarta.month;
  const year = Number(sp.tahun) || nowJakarta.year;
  const { from, to } = jakartaMonthRange(year, month);
  const lr = await getLabaRugi({ from, to });

  const Row = ({
    label,
    value,
    bold,
    indent,
  }: {
    label: string;
    value: number;
    bold?: boolean;
    indent?: boolean;
  }) => (
    <div className={`flex justify-between py-2 ${bold ? "border-t-2 border-ink font-serif text-lg font-semibold" : "font-mono text-[0.88rem]"} ${indent ? "pl-5" : ""}`}>
      <span>{label}</span>
      <span>{rupiah(value)}</span>
    </div>
  );

  return (
    <>
      <PeriodPicker month={month} year={year} currentYear={nowJakarta.year} />
      <Panel id="report-doc">
        <PanelHead title={`Laporan Laba Rugi — ${MONTH_NAMES[month - 1]} ${year}`} />
        <div className="p-6">
          <Row label="Penjualan Bruto" value={lr.penjualanBruto} />
          <Row label="Pendapatan Ongkos Kirim" value={lr.pendapatanOngkosKirim} />
          <Row label="Diskon Penjualan" value={-lr.diskonPenjualan} />
          <Row label="Pendapatan Bersih" value={lr.pendapatanBersih} bold />

          <div className="h-4" />
          <Row label="Harga Pokok Penjualan (HPP)" value={-lr.hpp} />
          <Row label="Laba Kotor" value={lr.labaKotor} bold />

          <div className="h-4" />
          {lr.beban.map((b) => (
            <Row key={b.code} label={`${b.code} — ${b.name}`} value={-b.total} indent />
          ))}
          <Row label="Total Beban" value={-lr.totalBeban} />

          <div className="h-4" />
          <Row label={lr.labaBersih >= 0 ? "Laba Bersih" : "Rugi Bersih"} value={lr.labaBersih} bold />
        </div>
      </Panel>
    </>
  );
}
