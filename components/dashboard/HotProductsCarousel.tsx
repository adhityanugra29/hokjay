"use client";

import { useRef } from "react";
import { rupiah } from "@/lib/format";
import type { HotProduct, HotBadge } from "@/lib/dashboard";

const BADGE_LABEL: Record<HotBadge, (p: HotProduct) => string> = {
  terlaris: (p) => `🔥 ${p.terjualBulanIni} terjual bulan ini`,
  stok: () => "📦 Stok Terbanyak",
  insentif: () => "💰 Insentif Tertinggi",
};

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
            className="w-[240px] flex-none snap-start border border-line bg-panel"
          >
            <div className="flex aspect-4/3 items-center justify-center overflow-hidden bg-surface text-[0.68rem] text-muted">
              {p.fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.fotoUrl} alt={p.name} className="h-full w-full object-cover" />
              ) : (
                "Tidak ada foto"
              )}
            </div>
            <div className="p-4">
              <div className="text-[0.9rem] font-medium">{p.name}</div>
              <div className="mt-1.5 text-[0.85rem] font-extrabold">{rupiah(p.hargaRekomendasi)}</div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {p.badges.map((b) => (
                  <span key={b} className="border border-accent px-2 py-1 text-[0.62rem] font-semibold text-accent">
                    {BADGE_LABEL[b](p)}
                  </span>
                ))}
              </div>
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
