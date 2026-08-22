import ReportDocument from "@/components/akuntansi/ReportDocument";
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

  const persenLaba = lr.pendapatanBersih > 0 ? Math.round((lr.labaBersih / lr.pendapatanBersih) * 100) : 0;
  const untungRugi = lr.labaBersih >= 0 ? "untung" : "rugi";
  const daysInMonth = new Date(year, month, 0).getDate();

  return (
    <ReportDocument
      title="Laporan Laba Rugi"
      periodLabel={`1 – ${daysInMonth} ${MONTH_NAMES[month - 1]} ${year}`}
      interpretiveNote={`Artinya: setelah semua barang, gaji, dan biaya operasional dihitung, ${MONTH_NAMES[month - 1]} ${year} ${untungRugi} ${rupiah(Math.abs(lr.labaBersih))} — sekitar ${Math.abs(persenLaba)}% dari pendapatan bersih.`}
    >
      <div className="mt-5">
        <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          Pendapatan
        </div>
        <Row label="Penjualan Bruto" value={lr.penjualanBruto} />
        <Row label="Pendapatan Ongkos Kirim" value={lr.pendapatanOngkosKirim} />
        <Row label="Diskon Penjualan" value={-lr.diskonPenjualan} />
        <Row label="Pendapatan Bersih" value={lr.pendapatanBersih} bold />

        <div className="mt-5 mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          Harga Pokok
        </div>
        <Row label="Harga Pokok Penjualan (HPP)" value={-lr.hpp} />
        <Row label="Laba Kotor" value={lr.labaKotor} bold />

        <div className="mt-5 mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          Beban Usaha
        </div>
        {lr.beban.map((b) => (
          <Row key={b.code} label={`${b.code} — ${b.name}`} value={-b.total} indent />
        ))}
        <Row label="Total Beban" value={-lr.totalBeban} />

        <div className="h-2" />
        <Row label={lr.labaBersih >= 0 ? "Laba Bersih" : "Rugi Bersih"} value={lr.labaBersih} bold />
      </div>
    </ReportDocument>
  );
}
