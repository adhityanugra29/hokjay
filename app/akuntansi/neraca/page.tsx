import ReportDocument from "@/components/akuntansi/ReportDocument";
import { getNeraca } from "@/lib/akuntansi";
import { rupiah } from "@/lib/format";
import { currentJakartaMonthYear, jakartaMonthEnd } from "@/lib/timezone";
import { MONTH_NAMES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function NeracaPage({ searchParams }: PageProps<"/akuntansi/neraca">) {
  const sp = await searchParams;
  const nowJakarta = currentJakartaMonthYear();
  const month = Number(sp.bulan) || nowJakarta.month;
  const year = Number(sp.tahun) || nowJakarta.year;
  const asOf = jakartaMonthEnd(year, month);

  const neraca = await getNeraca(asOf);
  const balanced = Math.abs(neraca.totalAset - (neraca.totalKewajiban + neraca.totalEkuitas)) < 1;

  const Row = ({ label, value, bold }: { label: string; value: number; bold?: boolean }) => (
    <div
      className={`flex justify-between py-2 ${
        bold ? "border-t-2 border-ink font-serif text-lg font-semibold" : "font-mono text-[0.88rem]"
      }`}
    >
      <span>{label}</span>
      <span>{rupiah(value)}</span>
    </div>
  );

  return (
    <ReportDocument title="Neraca" periodLabel={`Per akhir ${MONTH_NAMES[month - 1]} ${year}`}>
      <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Aset</h3>
          {neraca.aset.map((a) => (
            <Row key={a.code} label={`${a.code} — ${a.name}`} value={a.total} />
          ))}
          <Row label="Total Aset" value={neraca.totalAset} bold />
        </div>

        <div>
          <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Kewajiban
          </h3>
          {neraca.kewajiban.length === 0 && (
            <div className="py-2 font-mono text-[0.82rem] text-muted">Tidak ada kewajiban tercatat.</div>
          )}
          {neraca.kewajiban.map((a) => (
            <Row key={a.code} label={`${a.code} — ${a.name}`} value={a.total} />
          ))}
          <Row label="Total Kewajiban" value={neraca.totalKewajiban} />

          <h3 className="mt-6 mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Ekuitas
          </h3>
          {neraca.ekuitas.map((a) => (
            <Row key={a.code} label={`${a.code} — ${a.name}`} value={a.total} />
          ))}
          <Row label="Laba (Rugi) Berjalan" value={neraca.labaBerjalan} />
          <Row label="Total Ekuitas" value={neraca.totalEkuitas} />

          <Row label="Total Kewajiban + Ekuitas" value={neraca.totalKewajiban + neraca.totalEkuitas} bold />
        </div>
      </div>
      <div className={`mt-4 font-mono text-[0.75rem] ${balanced ? "text-moss-deep" : "text-danger"}`}>
        {balanced ? "✓ Balance — Aset = Kewajiban + Ekuitas" : "⚠ Tidak balance, ada yang perlu dicek"}
      </div>
    </ReportDocument>
  );
}
