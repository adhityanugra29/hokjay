"use client";

import Link from "next/link";
import { rupiah } from "@/lib/format";
import type { HotProduct } from "@/lib/dashboard";

export default function HotProductsCarousel({ products }: { products: HotProduct[] }) {
  if (products.length === 0) {
    return <div className="border-t border-line py-8 text-center font-sans text-sm text-muted">Belum ada data produk.</div>;
  }

  return (
    <div
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
            <div className="mt-1.5 text-[0.68rem] uppercase tracking-[0.08em] text-muted">Komisi</div>
            <div className="text-[1.15rem] font-extrabold text-accent-700">{rupiah(p.komisiNominal)}</div>
            <Link
              href="/katalog"
              className="mt-auto block w-full border border-accent bg-accent py-2.5 text-center font-sans text-[0.8rem] font-semibold text-white no-underline"
            >
              Ayo Jualan
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
