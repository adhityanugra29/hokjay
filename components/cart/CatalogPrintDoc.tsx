"use client";

import { useCart } from "./CartProvider";
import { rupiah } from "@/lib/format";

/**
 * Positioned off-screen (not display:none) so html2pdf/html2canvas can
 * render it when "Unduh Katalog (PDF)" is clicked (see CartBar) — it needs
 * real layout to snapshot, which display:none elements don't have. Never
 * visible to the user and excluded from native browser printing.
 * Renders just the cart's selected products, mirroring the mockup's
 * downloadCatalogPDF()/#catalogPrintDoc behaviour.
 */
export default function CatalogPrintDoc() {
  const { items } = useCart();

  return (
    <div id="catalog-print-doc" className="fixed top-0 left-[-9999px] w-[800px] bg-white p-5 print:hidden">
      <h1 className="mb-1 font-serif text-[1.8rem]">Katalog Produk — CV HORECA JAYA</h1>
      <div className="mb-6 font-mono text-[0.75rem] text-muted">
        Dipilih khusus untuk pelanggan · {items.length} produk
      </div>
      <div className="grid grid-cols-3 gap-4">
        {items.map((it) => (
          <div key={it.productId} className="break-inside-avoid overflow-hidden rounded-[6px] border border-line">
            {it.fotoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.fotoUrl} alt={it.name} className="block aspect-4/3 w-full border-b border-line object-cover" />
            )}
            <div className="p-3.5">
              <div className="text-[0.95rem] font-semibold">{it.name}</div>
              <div className="mt-1 font-mono text-[0.9rem] font-semibold text-moss-deep">
                {rupiah(it.hargaJual)} / unit
              </div>
              <div className="mt-2">
                {it.kondisiLabel && (
                  <span className="mr-1.5 mb-1 inline-block rounded-xl border border-line px-2 py-0.5 font-mono text-[0.65rem] text-ink">
                    {it.kondisiLabel}
                  </span>
                )}
                {it.stockStatusLabel && (
                  <span className="mr-1.5 mb-1 inline-block rounded-xl border border-line px-2 py-0.5 font-mono text-[0.65rem] text-ink">
                    {it.stockStatusLabel}
                  </span>
                )}
              </div>
              {it.specsText && (
                <div className="mt-1.5 whitespace-pre-line font-mono text-[0.7rem] leading-relaxed text-muted">
                  {it.specsText}
                </div>
              )}
              <div className="mt-1.5 font-mono text-[0.7rem] leading-relaxed text-muted">Qty diminati: {it.qty}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
