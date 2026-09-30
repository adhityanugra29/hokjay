"use client";

import { useRouter } from "next/navigation";
import NavIcon from "@/components/layout/NavIcons";
import { rupiahCompact } from "@/lib/format";
import type { SalesBoard as SalesBoardData, SalesBoardRow } from "@/lib/insentif";
import { initials } from "./boardUtils";

/**
 * Mobile leaderboard, "Soft Trade" version (replaces the dark-header "7e"
 * layout, per the user's request 2026-09-30 — same card language as the
 * desktop SalesBoard.tsx and the Katalog/Pelanggan pages). Top 3 are cards
 * that shrink in emphasis (#1 gets the yellow-tinted hero card), the rest
 * sit in one list card, and — when the viewer is a sales role on this board
 * — a "Posisi kamu" card is pinned to the bottom via position:sticky.
 *
 * The rank-#1 card has no komisi figure: SalesBoardRow doesn't carry
 * per-row commission, and it's private anyway (2026-09-19).
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
  const { rows, teamTarget, daysRemaining } = board;
  const top = rows.slice(0, 3);
  const rest = rows.slice(3);

  const myIndex = currentUserNama ? rows.findIndex((r) => r.salesNama === currentUserNama) : -1;
  const me = myIndex >= 0 ? rows[myIndex] : null;
  const aboveMe = myIndex > 0 ? rows[myIndex - 1] : null;
  const gapToAbove = me && aboveMe ? Math.max(0, aboveMe.totalPenjualan - me.totalPenjualan) : 0;

  return (
    <div className="flex min-h-[calc(100vh-58px)] flex-col bg-paper md:hidden">
      <div className="px-4 pb-1.5 pt-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => router.back()} className="-ml-2 flex h-11 w-11 items-center justify-center text-ink" aria-label="Kembali">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <path d="M12.5 4.5 7 10l5.5 5.5" />
            </svg>
          </button>
          <div className="font-sans text-[1.15rem] font-black tracking-tight">Papan Peringkat</div>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 font-sans text-[11.5px] text-muted">
          <span>
            {periodLabel} · sisa <b className="text-ink">{daysRemaining} hari</b>
          </span>
          {teamTarget > 0 && (
            <span>
              Target tim <b className="text-ink">{rupiahCompact(teamTarget)}</b>
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 px-3.5 pb-3.5 pt-2.5">
        {rows.length === 0 && (
          <div className="rounded-2xl bg-panel py-10 text-center font-sans text-[0.85rem] text-muted shadow-sm">
            Belum ada penjualan lunas periode ini.
          </div>
        )}

        {top.map((r, i) => (
          <PodiumCard key={r.salesNama} r={r} rank={i + 1} />
        ))}

        {rest.length > 0 && (
          <div className="overflow-hidden rounded-2xl bg-panel shadow-sm">
            {rest.map((r, i) => (
              <div
                key={r.salesNama}
                className={`grid grid-cols-[26px_1fr_auto] items-center gap-3 px-3.5 py-3 ${i > 0 ? "border-t border-line" : ""}`}
              >
                <span className="text-center font-sans text-[1rem] font-extrabold text-muted">{i + 4}</span>
                <span className="min-w-0">
                  <b className="block truncate font-sans text-[0.85rem]">{r.salesNama}</b>
                  {r.target > 0 && (
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface">
                      <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(r.percent, 100)}%` }} />
                    </span>
                  )}
                </span>
                <span className="text-right">
                  <b className="block whitespace-nowrap font-sans text-[0.82rem] tracking-tight">{rupiahCompact(r.totalPenjualan)}</b>
                  <span className="block text-[10.5px] text-muted">{r.target > 0 ? `${r.percent}%` : "—"}</span>
                  {r.estimasiSales > 0 && (
                    <span className="block text-[10px] font-medium text-[#0369A1]">+ Est. {rupiahCompact(r.estimasiSales)}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {me && (
        <div className="sticky bottom-[58px] mx-3.5 mb-3.5 flex items-center justify-between gap-3 rounded-2xl bg-ink px-3.5 py-3 text-white shadow-lg">
          <span className="flex items-center gap-3">
            <b className="font-sans text-[1.4rem] tracking-tight">{myIndex + 1}</b>
            <span>
              <span className="block font-sans text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/50">Posisi kamu</span>
              <b className="block font-sans text-[0.85rem]">{me.salesNama}</b>
              <span className="block font-sans text-[10.5px] text-white/60">
                {myIndex === 0
                  ? "Kamu di puncak 🎉"
                  : gapToAbove > 0
                    ? `${rupiahCompact(gapToAbove)} lagi untuk naik ke ${myIndex}`
                    : "Sudah menyamai posisi di atas"}
              </span>
            </span>
          </span>
          {me.target > 0 ? (
            <span className="rounded-full bg-accent px-2.5 py-1 font-sans text-[0.75rem] font-bold text-ink">{me.percent}%</span>
          ) : (
            <NavIcon name="chevron-right" size={16} />
          )}
        </div>
      )}
    </div>
  );
}

function PodiumCard({ r, rank }: { r: SalesBoardRow; rank: number }) {
  const first = rank === 1;
  return (
    <div
      className={`grid grid-cols-[30px_46px_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-2 rounded-2xl px-3.5 ${
        first ? "bg-linear-to-br from-accent-100 to-panel py-4 shadow-lg shadow-accent-700/15" : "bg-panel py-3.5 shadow-sm"
      }`}
    >
      <span
        className={`flex items-center justify-center rounded-full font-sans font-black ${first ? "h-7 bg-accent text-[1rem]" : "text-[1.05rem]"}`}
      >
        {rank}
      </span>
      <span
        className={`flex items-center justify-center rounded-full font-sans font-extrabold ${
          first ? "h-[54px] w-[54px] bg-accent" : "h-[46px] w-[46px] bg-surface"
        }`}
      >
        {initials(r.salesNama)}
      </span>
      <span className="min-w-0">
        <b className={`block font-sans font-extrabold wrap-anywhere ${first ? "text-[1.05rem]" : "text-[0.92rem]"}`}>{r.salesNama}</b>
        <span className="text-[11px] text-muted">
          {r.orderCount} transaksi{r.target > 0 ? ` · ${r.percent}%` : ""}
        </span>
      </span>
      <span className="text-right">
        <b className={`block whitespace-nowrap font-sans font-black tracking-tight ${first ? "text-[1.1rem]" : "text-[0.95rem]"}`}>
          {rupiahCompact(r.totalPenjualan)}
        </b>
        {/* Estimasi Sales — never part of the ranking. Per the user's request 2026-09-19. */}
        {r.estimasiSales > 0 && (
          <span className="text-[10.5px] font-semibold text-[#0369A1]">+ Est. {rupiahCompact(r.estimasiSales)}</span>
        )}
      </span>
      {r.target > 0 && (
        <span className="col-span-full h-[7px] overflow-hidden rounded-full bg-surface">
          <span className={`block h-full rounded-full ${first ? "bg-accent" : "bg-ink"}`} style={{ width: `${Math.min(r.percent, 100)}%` }} />
        </span>
      )}
    </div>
  );
}
