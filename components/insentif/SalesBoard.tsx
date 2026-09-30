import Link from "next/link";
import { rupiah, rupiahCompact } from "@/lib/format";
import type { SalesBoard as SalesBoardData, SalesBoardRow } from "@/lib/insentif";
import { initials } from "./boardUtils";

/**
 * Desktop leaderboard, "Soft Trade" podium version (replaces the hard-border
 * "5a" layout, per the user's request 2026-09-30 — matched to the Katalog
 * ProductCard / Pelanggan card treatment: rounded panel cards, soft shadow,
 * pill chips, no thick borders). Team summary cards, then a top-3 podium
 * (2-1-3, center card raised), then the rest as one list card.
 *
 * Ranking, the "Lewat target" numbers and Estimasi Sales all come from the
 * same SalesBoardData as before — ranking stays Lunas-only, Estimasi Sales
 * stays a small chip that never affects it, and there is deliberately no
 * komisi figure anywhere ("saya lupa itu privasi", 2026-09-19).
 */
export default function SalesBoard({ board, periodLabel }: { board: SalesBoardData; periodLabel: string }) {
  const { rows, teamTotal, teamTarget, teamPercent, teamGap, daysRemaining } = board;
  const lewatCount = rows.filter((r) => r.lewatTarget).length;
  const belumCount = rows.length - lewatCount;

  const top = rows.slice(0, 3);
  const rest = rows.slice(3);
  // Visual order 2-1-3; missing ranks just drop out (1 sales -> only #1).
  const podium = [top[1] && { r: top[1], rank: 2 }, top[0] && { r: top[0], rank: 1 }, top[2] && { r: top[2], rank: 3 }].filter(
    (x): x is { r: SalesBoardRow; rank: number } => !!x,
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          CV Horeca Jaya · Papan penjualan
        </div>
        <h1 className="mt-1 font-sans text-[2rem] font-black tracking-tight">{periodLabel}</h1>
      </div>

      <div className="grid grid-cols-[1.6fr_1fr_1fr] gap-3.5">
        <div className="min-w-0 rounded-2xl bg-panel p-5 shadow-sm">
          {teamTarget > 0 ? (
            <>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                Target tim {rupiah(teamTarget)}
              </div>
              <div className="mt-1.5 font-sans text-[1.5rem] font-black tracking-tight">
                {rupiah(teamTotal)} <span className="text-[0.9rem] font-bold text-muted">· {teamPercent}%</span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-ink" style={{ width: `${Math.min(teamPercent, 100)}%` }} />
              </div>
              <div className="mt-2 text-[0.75rem] text-muted">
                {teamGap > 0 ? (
                  <>
                    Kurang <b className="font-bold text-accent-700">{rupiahCompact(teamGap)}</b> lagi untuk tercapai
                  </>
                ) : (
                  <b className="font-bold text-accent-700">Target tim tercapai 🎉</b>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Penjualan tim</div>
              <div className="mt-1.5 font-sans text-[1.5rem] font-black tracking-tight">{rupiah(teamTotal)}</div>
              <div className="mt-2 text-[0.75rem] text-muted">
                Belum ada target tim —{" "}
                <Link href="/admin" className="text-accent-700 underline underline-offset-2">
                  atur target per sales di Admin → Kelola User
                </Link>
                .
              </div>
            </>
          )}
        </div>
        <div className="min-w-0 rounded-2xl bg-panel p-5 shadow-sm">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Sisa waktu</div>
          <div className="mt-1.5 font-sans text-[1.5rem] font-black tracking-tight text-accent-700">{daysRemaining} hari</div>
        </div>
        <div className="min-w-0 rounded-2xl bg-panel p-5 shadow-sm">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Lewat target</div>
          <div className="mt-1.5 font-sans text-[1.5rem] font-black tracking-tight">
            {lewatCount} <span className="text-[0.9rem] font-bold text-muted">dari {rows.length} sales</span>
          </div>
          {belumCount > 0 && <div className="mt-2 text-[0.75rem] text-muted">{belumCount} orang masih dalam jangkauan</div>}
        </div>
      </div>

      {rows.length === 0 && (
        <div className="rounded-2xl bg-panel py-14 text-center text-sm text-muted shadow-sm">
          Belum ada penjualan lunas periode ini.
        </div>
      )}

      {podium.length > 0 && (
        <div className="flex items-end justify-center gap-4">
          {podium.map(({ r, rank }) => {
            const first = rank === 1;
            const hasTarget = r.target > 0;
            return (
              <div
                key={r.salesNama}
                className={`relative min-w-0 rounded-2xl text-center ${
                  first
                    ? "max-w-[380px] flex-[1.12] bg-linear-to-b from-accent-100 to-panel px-5 pb-6 pt-8 shadow-lg shadow-accent-700/15"
                    : "max-w-[340px] flex-1 bg-panel px-5 pb-5 pt-6 shadow-sm"
                }`}
              >
                <span
                  className={`absolute left-3 top-3 inline-flex h-[26px] min-w-[26px] items-center justify-center rounded-full px-2 font-sans text-[0.75rem] font-extrabold ${
                    first ? "bg-accent" : "bg-surface"
                  }`}
                >
                  {rank}
                </span>
                {first && (
                  <span className="absolute right-3 top-3 rounded-full bg-ink px-2.5 py-1 font-sans text-[0.68rem] font-bold text-white">
                    Terbaik periode ini
                  </span>
                )}
                <div
                  className={`mx-auto flex items-center justify-center rounded-full font-sans font-black ${
                    first ? "h-[76px] w-[76px] bg-accent text-[1.5rem] ring-4 ring-white" : "h-14 w-14 bg-surface text-[1.1rem]"
                  }`}
                >
                  {initials(r.salesNama)}
                </div>
                <div className={`mt-3 font-sans font-extrabold tracking-tight wrap-anywhere ${first ? "text-[1.25rem]" : "text-[1.05rem]"}`}>
                  {r.salesNama}
                </div>
                <div className="mt-0.5 text-[0.75rem] text-muted">{r.orderCount} order</div>
                <div className={`mt-3.5 font-sans font-black tracking-tight whitespace-nowrap ${first ? "text-[1.7rem]" : "text-[1.35rem]"}`}>
                  {rupiah(r.totalPenjualan)}
                </div>
                <div className="mt-2.5 flex min-h-6 flex-wrap justify-center gap-1.5">
                  {hasTarget ? (
                    r.lewatTarget ? (
                      <span className="rounded-full bg-[#16A34A]/12 px-2.5 py-1 text-[0.68rem] font-semibold text-[#16A34A]">
                        {r.percent}% · lewat {rupiahCompact(r.selisih)}
                      </span>
                    ) : (
                      <span className="rounded-full bg-surface px-2.5 py-1 text-[0.68rem] font-semibold">{r.percent}% target</span>
                    )
                  ) : (
                    <span className="rounded-full bg-surface px-2.5 py-1 text-[0.68rem] font-semibold text-muted">Belum ada target</span>
                  )}
                  {/* Estimasi Sales — never part of the ranking (Lunas-only). Per the user's request 2026-09-19. */}
                  {r.estimasiSales > 0 && (
                    <span className="rounded-full bg-[#0369A1]/10 px-2.5 py-1 text-[0.68rem] font-semibold text-[#0369A1]">
                      + Est. {rupiahCompact(r.estimasiSales)}
                    </span>
                  )}
                </div>
                {hasTarget && (
                  <div className="mt-3.5 h-2.5 overflow-hidden rounded-full bg-surface">
                    <div className={`h-full rounded-full ${first ? "bg-accent" : "bg-ink"}`} style={{ width: `${Math.min(r.percent, 100)}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {rest.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-panel shadow-sm">
          {rest.map((r, i) => {
            const hasTarget = r.target > 0;
            return (
              <div
                key={r.salesNama}
                className={`grid grid-cols-[34px_44px_minmax(0,1.1fr)_minmax(0,1.4fr)_auto] items-center gap-3.5 px-5 py-3.5 ${
                  i > 0 ? "border-t border-line" : ""
                }`}
              >
                <span className="text-center font-sans font-extrabold text-muted">{i + 4}</span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface font-sans text-[0.85rem] font-extrabold">
                  {initials(r.salesNama)}
                </span>
                <span className="min-w-0">
                  <b className="block truncate font-sans font-extrabold">{r.salesNama}</b>
                  <span className="text-[0.75rem] text-muted">{r.orderCount} order</span>
                </span>
                <span className="min-w-0">
                  {hasTarget ? (
                    <>
                      <div className="h-2 overflow-hidden rounded-full bg-surface">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(r.percent, 100)}%` }} />
                      </div>
                      <div className="mt-1.5 text-[0.72rem] text-muted">
                        {r.lewatTarget ? "Lewat target " : "Kurang "}
                        {rupiahCompact(r.selisih)} · target {rupiah(r.target)} · {r.percent}%
                      </div>
                    </>
                  ) : (
                    <span className="text-[0.72rem] text-muted">Belum ada target</span>
                  )}
                </span>
                <span className="text-right">
                  <span className="block font-sans text-[1.05rem] font-black tracking-tight whitespace-nowrap">{rupiah(r.totalPenjualan)}</span>
                  {r.estimasiSales > 0 && (
                    <span className="mt-0.5 block text-[0.68rem] font-medium text-[#0369A1]">+ Est. {rupiahCompact(r.estimasiSales)}</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-accent-100 px-5 py-3.5">
          <span className="font-sans text-[0.85rem] font-semibold">
            {lewatCount > 0 ? `${lewatCount} orang sudah lewat target` : "Belum ada yang lewat target"}
            {belumCount > 0 ? ` · ${belumCount} orang masih dalam jangkauan` : ""}
          </span>
          <span className="text-[0.7rem] text-muted">Diperbarui otomatis tiap invoice lunas</span>
        </div>
      )}
    </div>
  );
}
