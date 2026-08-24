import PageHeader from "@/components/layout/PageHeader";
import BayarTagihanSheet from "@/components/purchasing/BayarTagihanSheet";
import { getBayarTagihanSummary, getTagihanBerjalan } from "@/lib/purchasing";
import { getGajiBulananSummary, currentPeriod } from "@/lib/payroll";
import { rupiah } from "@/lib/format";
import { currentJakartaMonthYear } from "@/lib/timezone";
import { MONTH_NAMES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * Bayar Tagihan — design "6b": urut jatuh tempo, dampak kas ditulis dulu.
 * See components/purchasing/BayarTagihanSheet.tsx.
 */
export default async function BayarTagihanPage() {
  const [summary, rows, gajiRows] = await Promise.all([
    getBayarTagihanSummary(),
    getTagihanBerjalan(),
    getGajiBulananSummary(currentPeriod()),
  ]);

  const gajiBelumDibayar = gajiRows.filter((r) => !r.sudahDibayar).reduce((s, r) => s + r.jumlah, 0);
  const { month, year } = currentJakartaMonthYear();
  const gajiPeriodeLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  return (
    <>
      <PageHeader
        title="Bayar Tagihan"
        subtitle="Apa yang jatuh tempo, dan cukup tidak kasnya — bukan yang paling baru masuk."
      />
      <div className="p-6 md:p-9">
        <div className="mb-6 grid grid-cols-2 border-2 border-ink bg-panel lg:grid-cols-4">
          <div className="border-b border-r border-line p-5 lg:border-b-0">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Kas tersedia
            </div>
            <div className="mt-1.5 whitespace-nowrap font-sans text-[1.4rem] font-extrabold">
              {rupiah(summary.kasTersedia)}
            </div>
          </div>
          <div className="border-b border-line p-5 lg:border-b-0 lg:border-r">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Jatuh tempo 7 hari
            </div>
            <div className="mt-1.5 whitespace-nowrap font-sans text-[1.4rem] font-extrabold">
              {rupiah(summary.jatuhTempo7HariNilai)}
            </div>
            <div className="mt-1 font-mono text-[0.7rem] text-muted">{summary.jatuhTempo7HariCount} tagihan</div>
          </div>
          <div className="border-r border-line p-5">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Sudah terlambat
            </div>
            <div className="mt-1.5 whitespace-nowrap font-sans text-[1.4rem] font-extrabold text-accent">
              {rupiah(summary.terlambatNilai)}
            </div>
            <div className="mt-1 font-mono text-[0.7rem] text-muted">{summary.terlambatCount} tagihan</div>
          </div>
          <div className="bg-ink p-5 text-white">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
              Total hutang usaha
            </div>
            <div className="mt-1.5 whitespace-nowrap font-sans text-[1.4rem] font-extrabold">
              {rupiah(summary.totalHutangNilai)}
            </div>
            <div className="mt-1 font-mono text-[0.7rem] text-white/55">{summary.totalHutangCount} tagihan berjalan</div>
          </div>
        </div>

        <BayarTagihanSheet
          rows={rows}
          kasTersedia={summary.kasTersedia}
          gajiBelumDibayar={gajiBelumDibayar}
          gajiPeriodeLabel={gajiPeriodeLabel}
        />
      </div>
    </>
  );
}
