"use client";

import { rupiahCompact } from "@/lib/format";

export interface FlowNode {
  label: string;
  value: number;
  tipe: "masuk" | "keluar";
}

// Literal hex, not the app's shared accent/clay/moss tokens — since the "Rak
// & Rel" redesign those all collapsed into one red voice (see globals.css),
// which is exactly why masuk vs keluar stopped being tellable at a glance.
// Matches Pill.tsx's existing "paid"/"out" palette so this stays consistent
// with how the rest of the app already colors money in vs money out.
const MASUK = { text: "#087a52", border: "#087a52", bg: "#f1faf6" };
const KELUAR = { text: "#c02c1c", border: "#c02c1c", bg: "#fdf3f1" };

/**
 * Redesigned 2026-08-22 — the previous version (Kas Toko on the far left,
 * masuk/keluar categories mixed together in one column on the right,
 * distinguished only by a thin 2px border at 35% opacity, in colors that by
 * then had also collapsed into the same red accent) made it genuinely hard
 * to tell inflow from outflow at a glance. Now: two clearly separated,
 * strongly tinted zones (green = masuk on the left, red = keluar on the
 * right) with Kas Toko in the middle, every amount explicitly prefixed
 * +/−, and one bold arrow per side showing the direction of flow instead
 * of a faint line per category.
 */
export default function CashFlowChart({
  masukTotal,
  keluarTotal,
  netTotal,
  nodes,
}: {
  masukTotal: number;
  keluarTotal: number;
  netTotal: number;
  nodes: FlowNode[];
}) {
  const masukNodes = nodes.filter((n) => n.tipe === "masuk").sort((a, b) => b.value - a.value);
  const keluarNodes = nodes.filter((n) => n.tipe === "keluar").sort((a, b) => b.value - a.value);
  const netColor = netTotal >= 0 ? MASUK.text : KELUAR.text;

  return (
    <div className="p-5">
      <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr]">
        {/* MASUK — green zone */}
        <div className="rounded-lg border-2 p-4" style={{ borderColor: MASUK.border, backgroundColor: MASUK.bg }}>
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-1.5 font-mono text-[0.72rem] font-semibold tracking-wide uppercase"
              style={{ color: MASUK.text }}
            >
              <span aria-hidden>▾</span> Uang Masuk
            </div>
            <div className="font-serif text-xl font-bold" style={{ color: MASUK.text }}>
              +{rupiahCompact(masukTotal)}
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            {masukNodes.map((n) => (
              <div
                key={n.label}
                className="flex items-center justify-between border-l-2 bg-white px-3 py-2 text-sm shadow-sm"
                style={{ borderLeftColor: MASUK.border }}
              >
                <span className="font-mono text-[0.72rem] text-muted">{n.label}</span>
                <span className="font-mono text-[0.8rem] font-semibold" style={{ color: MASUK.text }}>
                  +{rupiahCompact(n.value)}
                </span>
              </div>
            ))}
            {masukNodes.length === 0 && (
              <div className="px-3 py-2 font-mono text-[0.72rem] text-muted">Belum ada pemasukan.</div>
            )}
          </div>
        </div>

        {/* Center: Kas Toko flanked by direction arrows */}
        <div className="flex flex-row items-center justify-center gap-2 lg:flex-col lg:gap-3">
          <span className="hidden font-mono text-2xl leading-none lg:block" style={{ color: MASUK.text }} aria-hidden>
            →
          </span>
          <span className="font-mono text-xl leading-none lg:hidden" style={{ color: MASUK.text }} aria-hidden>
            ↓
          </span>
          <div className="flex flex-col items-center rounded-2xl border border-line bg-white px-6 py-4 shadow-md">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-paper text-2xl">
              💰
            </div>
            <div className="mt-2 text-center font-serif text-[0.95rem] font-semibold">Kas Toko</div>
            <div className="text-center font-mono text-[0.72rem] font-semibold" style={{ color: netColor }}>
              Bersih {netTotal >= 0 ? "+" : "−"}
              {rupiahCompact(Math.abs(netTotal))}
            </div>
          </div>
          <span className="hidden font-mono text-2xl leading-none lg:block" style={{ color: KELUAR.text }} aria-hidden>
            →
          </span>
          <span className="font-mono text-xl leading-none lg:hidden" style={{ color: KELUAR.text }} aria-hidden>
            ↓
          </span>
        </div>

        {/* KELUAR — red zone */}
        <div className="rounded-lg border-2 p-4" style={{ borderColor: KELUAR.border, backgroundColor: KELUAR.bg }}>
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-1.5 font-mono text-[0.72rem] font-semibold tracking-wide uppercase"
              style={{ color: KELUAR.text }}
            >
              <span aria-hidden>▾</span> Uang Keluar
            </div>
            <div className="font-serif text-xl font-bold" style={{ color: KELUAR.text }}>
              −{rupiahCompact(keluarTotal)}
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            {keluarNodes.map((n) => (
              <div
                key={n.label}
                className="flex items-center justify-between border-l-2 bg-white px-3 py-2 text-sm shadow-sm"
                style={{ borderLeftColor: KELUAR.border }}
              >
                <span className="font-mono text-[0.72rem] text-muted">{n.label}</span>
                <span className="font-mono text-[0.8rem] font-semibold" style={{ color: KELUAR.text }}>
                  −{rupiahCompact(n.value)}
                </span>
              </div>
            ))}
            {keluarNodes.length === 0 && (
              <div className="px-3 py-2 font-mono text-[0.72rem] text-muted">Belum ada pengeluaran.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
