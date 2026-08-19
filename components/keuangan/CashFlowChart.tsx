"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { rupiahCompact } from "@/lib/format";

export interface FlowNode {
  label: string;
  value: number;
  tipe: "masuk" | "keluar";
}

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

const COLOR = { masuk: "#0e7c66", keluar: "#e8542e" };

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
  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const masukRef = useRef<HTMLDivElement>(null);
  const keluarRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [lines, setLines] = useState<Line[]>([]);

  const orderedNodes = [...nodes.filter((n) => n.tipe === "masuk"), ...nodes.filter((n) => n.tipe === "keluar")];

  useLayoutEffect(() => {
    function measure() {
      const container = containerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const rel = (el: HTMLDivElement | null, side: "left" | "right") => {
        if (!el) return { x: 0, y: 0 };
        const r = el.getBoundingClientRect();
        return { x: (side === "left" ? r.left : r.right) - cRect.left, y: r.top + r.height / 2 - cRect.top };
      };

      const center = rel(centerRef.current, "right");
      const masuk = rel(masukRef.current, "left");
      const masukRight = rel(masukRef.current, "right");
      const keluar = rel(keluarRef.current, "left");
      const keluarRight = rel(keluarRef.current, "right");

      const newLines: Line[] = [
        { x1: center.x, y1: center.y, x2: masuk.x, y2: masuk.y, color: COLOR.masuk },
        { x1: center.x, y1: center.y, x2: keluar.x, y2: keluar.y, color: COLOR.keluar },
      ];

      orderedNodes.forEach((n, idx) => {
        const el = nodeRefs.current[idx];
        if (!el) return;
        const r = el.getBoundingClientRect();
        const point = { x: r.left - cRect.left, y: r.top + r.height / 2 - cRect.top };
        const from = n.tipe === "masuk" ? masukRight : keluarRight;
        newLines.push({ x1: from.x, y1: from.y, x2: point.x, y2: point.y, color: COLOR[n.tipe] });
      });

      setLines(newLines);
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  return (
    <div ref={containerRef} className="relative grid grid-cols-1 items-center gap-8 p-5 lg:grid-cols-[auto_1fr_1fr]">
      <svg className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block">
        {lines.map((l, idx) => (
          <path
            key={idx}
            d={`M ${l.x1} ${l.y1} C ${(l.x1 + l.x2) / 2} ${l.y1}, ${(l.x1 + l.x2) / 2} ${l.y2}, ${l.x2} ${l.y2}`}
            fill="none"
            stroke={l.color}
            strokeOpacity={0.35}
            strokeWidth={2}
          />
        ))}
      </svg>

      <div ref={centerRef} className="relative z-10 flex flex-col items-center">
        <div className="flex h-22 w-22 items-center justify-center rounded-2xl border border-line bg-white text-3xl shadow-md">
          💰
        </div>
        <div className="mt-2.5 text-center font-serif text-[0.95rem] font-semibold">Kas Toko</div>
        <div className="text-center font-mono text-[0.68rem] text-muted">
          Bersih {rupiahCompact(netTotal)}
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-4">
        <div ref={masukRef} className="border-l-[3px] border-moss bg-panel px-4 py-3 shadow-sm">
          <div className="font-mono text-[0.68rem] uppercase text-muted">Uang Masuk</div>
          <div className="font-serif text-lg font-semibold">{rupiahCompact(masukTotal)}</div>
        </div>
        <div ref={keluarRef} className="border-l-[3px] border-clay bg-panel px-4 py-3 shadow-sm">
          <div className="font-mono text-[0.68rem] uppercase text-muted">Uang Keluar</div>
          <div className="font-serif text-lg font-semibold">{rupiahCompact(keluarTotal)}</div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-2.5">
        {orderedNodes.map((n, idx) => (
          <div
            key={n.label}
            ref={(el) => {
              nodeRefs.current[idx] = el;
            }}
            className="border-l-2 bg-panel px-3.5 py-2.5 text-sm shadow-sm"
            style={{ borderLeftColor: COLOR[n.tipe] }}
          >
            <div className="font-mono text-[0.65rem] text-muted">{n.label}</div>
            <div className="font-mono text-[0.82rem] font-medium">{rupiahCompact(n.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
