"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * Click-to-zoom for Katalog product photos — per the user's request
 * 2026-08-25. Self-contained: click the thumbnail to open a full-screen
 * preview, click the backdrop / the ✕ / Escape to close. No external
 * lightbox library — just a fixed overlay.
 *
 * `label` (the small dimension footnote, e.g. "120cm x 80cm x 60cm") shows
 * on both the thumbnail AND the zoomed view — per the user's request
 * 2026-08-27, it was only ever on the thumbnail before (ProductCard
 * rendered it as its own separate overlay), not visible once zoomed.
 *
 * The thumbnail uses next/image (Vercel's optimizer serves a downsized
 * version of the 1600px-max source instead of the browser fetching the
 * full photo just to fill this card) — per the user's request 2026-08-28
 * to speed up page loads; this is the main product grid, so it's the
 * single biggest image-weight page in the app. The zoomed view stays a
 * plain <img> deliberately: zooming in is the one place a visitor
 * actually wants the full original resolution, downsizing it would work
 * against the feature's own purpose.
 */
export default function ZoomableImage({
  src,
  alt,
  className,
  label,
}: {
  src: string;
  alt: string;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        onClick={() => setOpen(true)}
        title="Klik untuk perbesar"
        className={`cursor-zoom-in object-cover ${className ?? ""}`}
      />
      {/* Relies on the caller's own wrapper already being position:relative
          (true for every current usage) — same positioning approach the
          thumbnail label always used before this was moved in here. */}
      {label && (
        <span className="absolute bottom-2.5 left-2.5 z-10 bg-ink/70 px-1.5 py-0.5 text-[9px] leading-none whitespace-nowrap text-white">
          {label}
        </span>
      )}
      {open && (
        <div
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/85 p-6"
          onClick={() => setOpen(false)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="max-h-[calc(100vh-3rem)] max-w-full cursor-default object-contain"
            />
            {label && (
              <span className="absolute bottom-3 left-3 bg-ink/70 px-2 py-1 text-[11px] leading-none whitespace-nowrap text-white">
                {label}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup"
            className="absolute right-4 top-4 flex h-10 w-10 cursor-pointer items-center justify-center border border-white/40 text-lg text-white hover:border-white"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
