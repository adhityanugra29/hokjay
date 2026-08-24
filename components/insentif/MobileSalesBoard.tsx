"use client";

import { useRouter } from "next/navigation";
import NavIcon from "@/components/layout/NavIcons";
import { rupiah, rupiahCompact } from "@/lib/format";
import type { SalesBoard as SalesBoardData } from "@/lib/insentif";

/**
 * "7e" — mobile-only leaderboard: dark header, rank #1 as a full-bleed red
 * hero, everyone else as compact dark-on-white rows, and (when the viewer is
 * a sales role appearing on this board) a "Posisi kamu" strip pinned to the
 * bottom via position:sticky so it's always visible no matter how far down
 * the list their own rank sits. See components/insentif/SalesBoard.tsx for
 * the desktop "5a" version this sits alongside (md:hidden / hidden md:block
 * split in app/insentif/page.tsx).
 *
 * Note: the mockup's rank-#1 hero also shows a komisi figure alongside the
 * penjualan total — SalesBoardRow doesn't carry per-row commission (only
 * lib/insentif.ts's separate payroll views do), so that line is left out
 * here rather than fabricated.
 */
export default function MobileSalesBoard({
  board,
  periodLabel,
  currentUserNama,
}: {
  board: SalesBoardData;
  periodLabel: string;
  currentUserNama?: string;
}) {
  const router = useRouter();
  const { rows, teamTarget, teamPercent, daysRemaining } = board;
  const top = rows[0];
  const rest = rows.slice(1);

  const myIndex = currentUserNama ? rows.findIndex((r) => r.salesNama === currentUserNama) : -1;
  const me = myIndex >= 0 ? rows[myIndex] : null;
  const aboveMe = myIndex > 0 ? rows[myIndex - 1] : null;
  const gapToAbove = me && aboveMe ? Math.max(0, aboveMe.totalPenjualan - me.totalPenjualan) : 0;

  return (
    <div className="flex min-h-[calc(100vh-58px)] flex-col bg-panel md:hidden">
      <div className="bg-ink px-4 pb-4 pt-3 text-white">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => router.back()} className="-ml-2 flex h-11 w-11 items-center justify-center text-white">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <path d="M12.5 4.5 7 10l5.5 5.5" />
            </svg>
          </button>
          <div className="font-sans text-[1.05rem] font-extrabold tracking-tight">Papan Peringkat</div>
        </div>
        <div className="mt-2 flex items-center justify-between font-sans text-[11px] text-white/55">
          <span>
            {periodLabel} · sisa {daysRemaining} hari
          </span>
          {teamTarget > 0 && (
            <span>
              Target tim <b className="text-white">{rupiahCompact(teamTarget)}</b>
            </span>
          )}
        </div>
      </div>

      <div className="flex-1">
        {top ? (
          <div className="bg-accent px-4 py-[18px] text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3.5">
                <div className="font-sans text-[2.4rem] font-extrabold leading-[0.8] tracking-tight">1</div>
                <div>
                  <div className="font-sans text-[1.1rem] font-extrabold tracking-tight">{top.salesNama}</div>
                  <div className="mt-1 font-sans text-[0.72rem] text-white/75">{top.orderCount} transaksi</div>
                </div>
              </div>
              {top.target > 0 && (
                <div className="text-right">
                  <div className="font-sans text-[1.25rem] font-extrabold leading-none tracking-tight">{top.percent}%</div>
                  <div className="mt-1 font-sans text-[10px] text-white/75">dari target</div>
                </div>
              )}
            </div>
            <div className="mt-3.5 font-sans text-[1.05rem] font-extrabold tracking-tight">{rupiah(top.totalPenjualan)}</div>
            {top.target > 0 && (
              <div className="relative mt-2.5 h-2 bg-white/25">
                <div className="absolute inset-y-0 left-0 bg-white" style={{ width: `${Math.min(top.percent, 100)}%` }} />
                <div className="absolute -top-1 -bottom-1 left-full w-0.5 bg-ink" />
              </div>
            )}
          </div>
        ) : (
          <div className="border-t border-line bg-white py-10 text-center font-sans text-[0.85rem] text-muted">
            Belum ada penjualan lunas periode ini.
          </div>
        )}

        <div className="border-t-2 border-ink bg-white">
          {rest.map((r, i) => (
            <div key={r.salesNama} className="grid grid-cols-[26px_1fr_auto] items-center gap-3 border-b border-line px-4 py-3.5">
              <span className="font-sans text-[1.15rem] font-extrabold tracking-tight text-ink/30">{i + 2}</span>
              <span className="min-w-0">
                <b className="block truncate font-sans text-[0.85rem]">{r.salesNama}</b>
                {r.target > 0 && (
                  <span className="relative mt-1.5 block h-2 bg-ink/10">
                    <span className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${Math.min(r.percent, 100)}%` }} />
                    <span className="absolute -top-0.5 -bottom-0.5 left-full w-0.5 bg-accent" />
                  </span>
                )}
              </span>
              <span className="text-right">
                <b className="block whitespace-nowrap font-sans text-[0.8rem] tracking-tight">{rupiahCompact(r.totalPenjualan)}</b>
                <span className="mt-0.5 block font-sans text-[10.5px] text-muted">{r.target > 0 ? `${r.percent}%` : "—"}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {me && (
        <div className="sticky bottom-[58px] border-t border-white/15 bg-ink px-4 py-3.5 text-white">
          <div className="font-sans text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/50">Posisi kamu</div>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <span className="flex items-center gap-3">
              <b className="font-sans text-[1.4rem] tracking-tight">{myIndex + 1}</b>
              <span>
                <b className="block font-sans text-[0.85rem]">{me.salesNama}</b>
                <span className="mt-0.5 block font-sans text-[10.5px] text-white/55">
                  {myIndex === 0
                    ? "Kamu di puncak 🎉"
                    : gapToAbove > 0
                      ? `${rupiahCompact(gapToAbove)} lagi untuk naik ke ${myIndex}`
                      : "Sudah menyamai posisi di atas"}
                </span>
              </span>
            </span>
            {me.target > 0 ? (
              <b className="font-sans text-[0.95rem] tracking-tight text-accent">{me.percent}%</b>
            ) : (
              <NavIcon name="chevron-right" size={16} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
