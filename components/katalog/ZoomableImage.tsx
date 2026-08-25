"use client";

import { useEffect, useState } from "react";

/**
 * Click-to-zoom for Katalog product photos — per the user's request
 * 2026-08-25. Self-contained: click the thumbnail to open a full-screen
 * preview, click the backdrop / the ✕ / Escape to close. No external
 * lightbox library — just a fixed overlay.
 */
export default function ZoomableImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={() => setOpen(true)}
        title="Klik untuk perbesar"
        className={`cursor-zoom-in ${className ?? ""}`}
      />
      {open && (
        <div
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/85 p-6"
          onClick={() => setOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full cursor-default object-contain"
          />
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
