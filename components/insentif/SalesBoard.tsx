import Link from "next/link";
import { rupiah, rupiahCompact } from "@/lib/format";
import type { SalesBoard as SalesBoardData } from "@/lib/insentif";

/**
 * "5a" — full-screen, light-ground leaderboard: the top sales becomes a red
 * band, everyone else sits white on the light ground, no tiers — just
 * achievement, remaining target, and a countdown. See the design doc the
 * user supplied 2026-08-24 (id="5a").
 */
export default function SalesBoard({ board, periodLabel }: { board: SalesBoardData; periodLabel: string }) {
  const { rows, teamTotal, teamTarget, teamPercent, teamGap, daysRemaining } = board;
  const lewatCount = rows.filter((r) => r.lewatTarget).length;
  const belumCount = rows.length - lewatCount;

  return (
    <div className="border-2 border-ink bg-panel">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b-2 border-ink px-5 py-5 sm:gap-6 sm:px-10 sm:py-7">
        <div>
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            CV Horeca Jaya · Papan penjualan
          </div>
          <h1 className="mt-2 font-sans text-[1.7rem] font-extrabold tracking-tight sm:text-[2.4rem]">{periodLabel}</h1>
        </div>
        <div className="flex flex-wrap items-end gap-5 sm:gap-8">
          <div>
            <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Penjualan tim
            </div>
            <div className="mt-2 whitespace-nowrap font-sans text-[1.3rem] font-extrabold tracking-tight sm:text-[1.6rem]">
              {rupiah(teamTotal)}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Sisa waktu
            </div>
            <div className="mt-2 whitespace-nowrap font-sans text-[1.6rem] font-extrabold leading-none tracking-tight text-accent sm:text-[2rem]">
              {daysRemaining} hari
            </div>
          </div>
        </div>
      </div>

      {teamTarget > 0 ? (
        <div className="border-b-2 border-ink bg-white px-5 py-5 sm:px-10">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
              Target tim {rupiah(teamTarget)}
            </span>
            <span className="font-mono text-[0.8rem] text-muted">
              {teamGap > 0 ? (
                <>
                  Kurang <b className="text-[1rem] text-accent-700">{rupiahCompact(teamGap)}</b> lagi untuk tercapai
                </>
              ) : (
                <b className="text-[1rem] text-accent-700">Target tim tercapai 🎉</b>
              )}
            </span>
          </div>
          <div className="relative mt-3 h-4 bg-ink/10">
            <div
              className="absolute inset-y-0 left-0 flex items-center justify-end bg-ink pr-2"
              style={{ width: `${Math.min(teamPercent, 100)}%` }}
            >
              <span className="font-sans text-[11px] font-extrabold text-white">{teamPercent}%</span>
            </div>
            <div className="absolute -top-1 -bottom-1 left-full w-0.5 bg-accent" />
          </div>
        </div>
      ) : (
        <div className="border-b-2 border-ink bg-white px-5 py-5 font-mono text-[0.8rem] text-muted sm:px-10">
          Belum ada target tim tercapai —{" "}
          <Link href="/admin" className="text-accent underline underline-offset-2">
            atur target per sales di Admin → Kelola User
          </Link>
          .
        </div>
      )}

      <div className="px-5">
        {rows.map((r) => {
          const isTop = r === rows[0];
          const hasTarget = r.target > 0;
          return (
            <div
              key={r.salesNama}
              className={`grid grid-cols-[40px_1fr] items-start gap-x-3 gap-y-2.5 px-4 py-4 sm:grid-cols-[58px_1fr_280px_96px_200px] sm:items-center sm:gap-6 sm:px-5 sm:py-5 ${
                isTop ? "bg-accent text-white" : "border-b border-ink/20 bg-white text-ink"
              }`}
            >
              <span className={`font-sans text-[1.6rem] font-extrabold leading-none tracking-tight sm:text-[2.1rem] ${isTop ? "text-white" : "text-ink/25"}`}>
                {rows.indexOf(r) + 1}
              </span>
              <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 sm:block">
                <span className="font-sans text-[1.15rem] font-extrabold tracking-tight sm:text-[1.4rem]">{r.salesNama}</span>
                <span className={`font-mono text-[12px] sm:mt-1 sm:block ${isTop ? "text-white/75" : "text-muted"}`}>
                  {r.orderCount} order
                </span>
              </span>
              <span className="col-start-2 sm:col-auto">
                {hasTarget ? (
                  <>
                    <div className={`relative h-3 ${isTop ? "bg-white/30" : "bg-ink/14"}`}>
                      <div
                        className={`absolute inset-y-0 left-0 ${isTop ? "bg-white" : "bg-accent"}`}
                        style={{ width: `${Math.min(r.percent, 100)}%` }}
                      />
                      <div className={`absolute -top-1 -bottom-1 left-full w-0.5 ${isTop ? "bg-white" : "bg-ink"}`} />
                    </div>
                    <div className={`mt-1.5 font-mono text-[11.5px] ${isTop ? "text-white/80" : "text-muted"}`}>
                      {r.lewatTarget ? "Lewat target " : "Kurang "}
                      {rupiahCompact(r.selisih)} · target {rupiah(r.target)}
                    </div>
                  </>
                ) : (
                  <span className={`font-mono text-[11.5px] ${isTop ? "text-white/70" : "text-muted"}`}>
                    Belum ada target
                  </span>
                )}
              </span>
              <span className="col-start-2 font-sans text-[1.1rem] font-extrabold tracking-tight sm:col-auto sm:text-right sm:text-[1.35rem]">
                {hasTarget ? `${r.percent}%` : "—"}
              </span>
              <span className="col-start-2 whitespace-nowrap font-sans text-[1.2rem] font-extrabold tracking-tight sm:col-auto sm:text-right sm:text-[1.45rem]">
                {rupiah(r.totalPenjualan)}
              </span>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="py-14 text-center font-mono text-sm text-muted">Belum ada penjualan lunas periode ini.</div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-accent px-5 py-4 text-white sm:px-10">
          <span className="font-sans text-[0.9rem] font-extrabold">
            {lewatCount > 0 ? `${lewatCount} orang sudah lewat target` : "Belum ada yang lewat target"}
            {belumCount > 0 ? ` · ${belumCount} orang masih dalam jangkauan` : ""}
          </span>
          <span className="font-mono text-[11px] text-white/80">Diperbarui otomatis tiap invoice lunas</span>
        </div>
      )}
    </div>
  );
}
