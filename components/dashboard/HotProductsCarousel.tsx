"use client";

import { useRef } from "react";
import Link from "next/link";
import { rupiah } from "@/lib/format";
import type { HotProduct } from "@/lib/dashboard";

export default function HotProductsCarousel({ products }: { products: HotProduct[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function slide(dir: -1 | 1) {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const step = (card?.offsetWidth ?? 260) + 16; // card width + gap
    el.scrollBy({ left: step * dir, behavior: "smooth" });
  }

  if (products.length === 0) {
    return <div className="border-t border-line py-8 text-center font-sans text-sm text-muted">Belum ada data produk.</div>;
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
        style={{ scrollbarWidth: "none" }}
      >
        {products.map((p) => (
          <div
            key={p._id}
            data-card
            className="flex w-[240px] flex-none flex-col snap-start border border-line bg-panel"
          >
            <div className="flex aspect-4/3 items-center justify-center overflow-hidden bg-surface text-[0.68rem] text-muted">
              {p.fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.fotoUrl} alt={p.name} className="h-full w-full object-cover" />
              ) : (
                "Tidak ada foto"
              )}
            </div>
            <div className="flex flex-1 flex-col p-4">
              {/* Fixed-height name/price/badge block so "Insentif" lands at
                  the same Y on every card regardless of how many lines the
                  product name wraps to or whether the terlaris badge shows. */}
              <div className="line-clamp-2 min-h-[2.75rem] text-[0.9rem] leading-snug font-medium">{p.name}</div>
              <div className="mt-1.5 text-[0.85rem] font-extrabold">{rupiah(p.hargaRekomendasi)}</div>
              <div className="mt-1.5 h-[1rem] font-sans text-[0.68rem] text-muted">
                {p.badges.includes("terlaris") ? `🔥 ${p.terjualBulanIni} terjual bulan ini` : ""}
              </div>
              <div className="mt-1.5 text-[0.68rem] uppercase tracking-[0.08em] text-muted">Insentif</div>
              <div className="text-[1.15rem] font-extrabold text-accent-700">{rupiah(p.komisiNominal)}</div>
              <Link
                href="/penjualan"
                className="mt-auto block w-full border border-accent bg-accent py-2.5 text-center font-sans text-[0.8rem] font-semibold text-white no-underline"
              >
                Ayo Jualan
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => slide(-1)}
          aria-label="Sebelumnya"
          className="h-8 w-8 cursor-pointer border border-line font-mono hover:border-accent hover:text-accent"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => slide(1)}
          aria-label="Berikutnya"
          className="h-8 w-8 cursor-pointer border border-line font-mono hover:border-accent hover:text-accent"
        >
          →
        </button>
      </div>
    </div>
  );
}
