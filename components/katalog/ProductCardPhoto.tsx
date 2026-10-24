"use client";

import { useState } from "react";
import ZoomableImage from "./ZoomableImage";
import { useDialog } from "@/components/ui/Dialog";
import { slugify } from "@/lib/format";
import type { KatalogProduct } from "./ProductCard";

/**
 * Downloads a photo by fetching it as a blob first: a plain <a href download> is ignored by browsers for cross-origin URLs (Vercel Blob is a different
 * origin). The dimension footnote is baked in server-side (app/api/products/[id]/download-photo/route.ts, sharp): compositing it client-side via <canvas>
 * depended on the browser's CORS/image-cache behavior and sometimes came out without it. A module-level function, not a hook (it can't call useDialog),
 * so failures propagate and the caller shows the error dialog.
 */
async function downloadPhoto(productId: string, filename: string) {
  const res = await fetch(`/api/products/${productId}/download-photo`);
  if (!res.ok) throw new Error("Gagal mengambil foto");
  const blob = await res.blob();
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

/** The photo area of a ProductCard (banners, pick checkbox, edit pencil, kondisi pill, zoomable photo, download button), moved out of ProductCard.tsx unchanged. */
export default function ProductCardPhoto({
  product,
  flashSaleActive,
  newStockBanner,
  bannerActive,
  pickMode,
  selected,
  availableQty,
  toggle,
  canEdit,
  onEdit,
  kondisiLabel,
  photoLabelText,
}: {
  product: KatalogProduct;
  flashSaleActive: boolean;
  newStockBanner: boolean;
  bannerActive: boolean;
  pickMode: boolean;
  selected: boolean;
  availableQty: number;
  toggle: (productId: string) => void;
  canEdit?: boolean;
  onEdit?: () => void;
  kondisiLabel: string;
  photoLabelText: string | null;
}) {
  const { alert } = useDialog();
  const [downloadingPhoto, setDownloadingPhoto] = useState(false);

  return (
    <div className="relative flex aspect-4/3 items-center justify-center overflow-hidden rounded-t-[10px] bg-surface text-[0.68rem] text-muted">
      {/* Flash Sale banner pinned to the photo's top edge; the pickMode checkbox / edit pencil are nudged down to clear it. */}
      {flashSaleActive && (
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-center gap-1.5 bg-accent py-1.5 font-mono text-[0.7rem] font-extrabold tracking-[0.08em] text-ink">
          🔥 FLASH SALE
        </div>
      )}
      {newStockBanner && (
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-center gap-1.5 bg-[#16A34A] py-1.5 font-mono text-[0.7rem] font-extrabold tracking-[0.08em] text-white">
          ✦ NEW STOCK
        </div>
      )}
      {/* Only an available product can go into the Katalog PDF. This is the UI guard; the real guarantee against a stale selection is the availability filter in CatalogPrintDoc.tsx. */}
      {pickMode && (
        <label
          className={`absolute ${bannerActive ? "top-8" : "top-2.5"} left-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-md border-2 border-line bg-panel shadow-sm ${
            availableQty <= 0 ? "cursor-not-allowed opacity-40" : "cursor-pointer"
          }`}
          style={selected ? { background: "var(--color-accent)", borderColor: "var(--color-accent)" } : undefined}
          title={availableQty <= 0 ? "Tidak tersedia — tidak bisa dipilih untuk katalog PDF" : "Pilih untuk katalog PDF"}
        >
          <input
            type="checkbox"
            checked={selected}
            disabled={availableQty <= 0}
            onChange={() => toggle(product._id)}
            className="sr-only"
          />
          {selected && <span className="text-[13px] leading-none font-bold text-white">✓</span>}
        </label>
      )}
      {canEdit && (
        <button
          type="button"
          title="Ubah data produk"
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
          className={`absolute ${bannerActive ? "top-8" : "top-2.5"} right-2.5 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/30 bg-ink/70 text-white hover:bg-ink`}
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13.5 3.5 16.5 6.5M4 16l.7-3.2L12.8 4.7a1.5 1.5 0 0 1 2.1 0l.4.4a1.5 1.5 0 0 1 0 2.1L7.2 15.3 4 16Z" />
          </svg>
        </button>
      )}
      {/* Kondisi pill sits top-left (bottom-left collided with ZoomableImage's dimension footnote), same top-8/top-2.5 banner offset as the checkbox/pencil,
          nudged right (left-11) while the pick-mode checkbox occupies that corner. */}
      <span
        className={`absolute z-10 rounded-full px-2.5 py-1 text-[0.66rem] font-semibold text-white ${
          bannerActive ? "top-8" : "top-2.5"
        } ${pickMode ? "left-11" : "left-2.5"}`}
        style={{ background: product.kondisi === "bekas" ? "#D97706" : "#16A34A" }}
      >
        {kondisiLabel}
      </span>
      {product.fotoUrl ? (
        <>
          <ZoomableImage
            src={product.fotoUrl}
            alt={product.name}
            className="h-full w-full object-cover"
            label={photoLabelText ?? undefined}
          />
          <button
            type="button"
            title="Unduh foto"
            disabled={downloadingPhoto}
            onClick={async (e) => {
              e.stopPropagation();
              if (!product.fotoUrl) return;
              setDownloadingPhoto(true);
              // Matches the server's extension choice (download-photo route): a labeled photo is always re-encoded to .jpg, an unlabeled one keeps its format.
              const ext = photoLabelText
                ? "jpg"
                : (product.fotoUrl.match(/\.(jpe?g|png|webp)(?:$|\?)/i)?.[1] ?? "jpg");
              try {
                await downloadPhoto(product._id, `${slugify(product.name) || "produk"}.${ext}`);
              } catch {
                await alert("Gagal mengunduh foto, coba lagi.");
              }
              setDownloadingPhoto(false);
            }}
            className="absolute right-2.5 bottom-2.5 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/30 bg-ink/70 text-white hover:bg-ink disabled:cursor-wait disabled:opacity-60"
          >
            {downloadingPhoto ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 3v10M6 9l4 4 4-4M4 16h12" />
              </svg>
            )}
          </button>
        </>
      ) : (
        "Tidak ada foto"
      )}
    </div>
  );
}
