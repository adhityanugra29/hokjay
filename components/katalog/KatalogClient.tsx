"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ProductCard, { type KatalogProduct } from "./ProductCard";
import EditProductDrawer from "./EditProductDrawer";
import { useCatalogSelection } from "./CatalogSelectionProvider";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useLoadingOverlay } from "@/components/ui/LoadingOverlay";

const ALL_CATEGORIES_LABEL = "Semua Kategori";

// Katalog PDF is the heaviest export in the app (photo-dense, often many
// pages). RENDER_SCALE was first dropped to 1.35 to shrink file size, but
// per the user's direct report against a real downloaded PDF ("tulisan
// jangan blur") that was too aggressive — html2canvas rasterizes text the
// same as everything else, so a lower scale means fewer literal pixels per
// character, not just a smaller file. Restored to 2 (the original,
// known-crisp value). JPEG_QUALITY went through the same lesson: 0.78, then
// 0.82, still read as blurry on the small 11-13px SKU/spec text — JPEG's
// block-based compression is genuinely rough on fine text edges regardless
// of resolution once quality drops much below "near-lossless". Raised to
// 0.94 (close to the original 0.98) so legibility is no longer a trade-off
// at all; the adaptive packing fitting more products per page (fewer total
// pages) is now the main thing keeping file size down instead of these two
// knobs.
const KATALOG_PDF_JPEG_QUALITY = 0.94;
const KATALOG_PDF_RENDER_SCALE = 2;

export default function KatalogClient({
  products,
  categories,
  canEditProduct,
}: {
  products: KatalogProduct[];
  categories: string[];
  /** Manager/Owner/Super Admin only. Per the user's request 2026-08-27. */
  canEditProduct?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const { selected, selectAll, pickMode, startPicking, cancelPicking } = useCatalogSelection();
  const { show: showLoading, hide: hideLoading } = useLoadingOverlay();

  // Staged flow: idle button ("Buat Katalog") -> click reveals checkboxes +
  // "Pilih Semua" (label stays "Buat Katalog", disabled while 0 selected) ->
  // once >=1 item is checked it relabels to "Unduh Katalog PDF - XX itemnya"
  // and now actually triggers the download.
  function handleMainButtonClick() {
    if (!pickMode) {
      startPicking();
      return;
    }
    if (selected.size === 0) return; // disabled below, but guard anyway
    downloadCatalogPDF();
  }

  const mainButtonLabel = downloading
    ? "Menyiapkan PDF..."
    : pickMode && selected.size > 0
      ? `Unduh Katalog PDF - ${selected.size} itemnya`
      : "Buat Katalog";

  async function downloadCatalogPDF() {
    if (selected.size === 0) return;
    let element = document.getElementById("catalog-print-doc");
    if (!element) return;

    setDownloading(true);
    // Shown immediately on click, not gated behind the fetch-patch's 2s
    // auto-threshold (LoadingOverlay.tsx) — the button's own label already
    // changes to "Menyiapkan PDF...", but for a many-page catalog this can
    // run long enough that a full-screen "Mohon menunggu" is warranted, not
    // just quiet text on a button easy to miss. Per the user's request
    // 2026-08-27.
    showLoading();
    try {
      // The offscreen catalog doc fetches its own product/category/sales
      // data on mount — wait for that instead of generating a near-empty
      // PDF (or, on a slow first click, silently doing nothing) if it
      // hasn't landed yet.
      for (let tries = 0; element.dataset.ready !== "true" && tries < 50; tries++) {
        await new Promise((r) => setTimeout(r, 100));
        element = document.getElementById("catalog-print-doc")!;
      }
      if (element.dataset.ready !== "true") {
        alert("Data katalog belum siap, coba lagi sebentar.");
        return;
      }

      // Product photos + the HOJAY logo load asynchronously — html2canvas
      // captures whatever's painted at the instant it runs, so an
      // in-flight image is captured blank (and, since the <img> reserves
      // its box via width/height either way, can throw pagination off by
      // however tall that gap ends up). Wait for every image in the
      // captured subtree to finish (or fail) loading first.
      const images = Array.from(element.querySelectorAll("img"));
      await Promise.all(
        images.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.addEventListener("load", () => resolve(), { once: true });
                img.addEventListener("error", () => resolve(), { once: true });
              })
        )
      );

      // Per-page capture (2026-08-26) — replaces html2pdf.js's single-shot
      // "capture the whole document, then slice it into pages" approach.
      // That slicing turned out to be unreliable to pin exactly on our own
      // page boundaries (repeated reports of a repeated category heading
      // bleeding across a page boundary, no matter how much buffer space
      // got added around the marker). CatalogPrintDoc.tsx now renders each
      // page as its own fixed-size `[data-print-page]` div; each one is
      // captured here as its own independent canvas and added as its own
      // jsPDF page directly — there's no shared canvas to slice, so nothing
      // can bleed from one page's capture into another's.
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const pageEls = Array.from(element.querySelectorAll<HTMLElement>("[data-print-page]"));
      if (pageEls.length === 0) {
        alert("Tidak ada halaman untuk diunduh.");
        return;
      }

      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageWidthMM = pdf.internal.pageSize.getWidth();
      const pageHeightMM = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pageEls.length; i++) {
        // scrollY/scrollX: html2canvas otherwise captures from the
        // *current* window scroll position — since the button that
        // triggers this sits far down the page (after browsing/picking
        // products), whatever the user had scrolled to leaked into the
        // capture. Per the user's report 2026-08-25.
        //
        // logging:false / imageTimeout:0 — per the user's request
        // 2026-08-27 to speed up the download without touching scale or
        // JPEG_QUALITY (the two knobs that actually affect visual quality,
        // already fought over across the fixes above). html2canvas's
        // default verbose console logging has real per-element overhead
        // across a many-page catalog; imageTimeout only matters for
        // images still loading, which none are by this point (already
        // awaited above).
        const canvas = await html2canvas(pageEls[i], {
          scale: KATALOG_PDF_RENDER_SCALE,
          useCORS: true,
          scrollY: -window.scrollY,
          scrollX: 0,
          logging: false,
          imageTimeout: 0,
        });
        const imgData = canvas.toDataURL("image/jpeg", KATALOG_PDF_JPEG_QUALITY);
        if (i > 0) pdf.addPage();
        // compression: "FAST" — jsPDF's own PDF-stream compression of the
        // already-JPEG-encoded bytes, not a second pass over the image
        // itself; doesn't touch KATALOG_PDF_JPEG_QUALITY.
        pdf.addImage(imgData, "JPEG", 0, 0, pageWidthMM, pageHeightMM, undefined, "FAST");
      }

      const today = new Date();
      const tanggal = [
        String(today.getDate()).padStart(2, "0"),
        String(today.getMonth() + 1).padStart(2, "0"),
        today.getFullYear(),
      ].join("-");
      pdf.save(`Katalog-CV-HORECA-JAYA_${tanggal}.pdf`);
    } catch (err) {
      // html2pdf/html2canvas failures otherwise vanish as an unhandled
      // rejection — no visible feedback beyond the button re-enabling —
      // which is exactly what made this bug hard to report/diagnose.
      console.error("Gagal membuat PDF katalog:", err);
      alert(
        `Gagal membuat PDF katalog: ${err instanceof Error ? err.message : String(err)}\n\nCoba lagi, atau screenshot pesan ini untuk dilaporkan.`
      );
    } finally {
      setDownloading(false);
      hideLoading();
    }
  }

  const filtered = useMemo(() => {
    let list = products;
    const q = search.trim().toLowerCase();
    if (q) {
      // A pure-number query (e.g. "80") also matches an exact P/L/T
      // dimension — per the user's request 2026-08-26 ("kalau user ketik
      // '80' maka akan muncul produk yang PxLxT ada angka 80 nya"),
      // confirmed as an exact match per dimension (80 matches a 80cm side,
      // not 180 or 800) rather than a substring match, so the numbers stay
      // meaningful as actual sizes. Still OR'd with the usual name/SKU
      // text search, not a replacement for it.
      const asNumber = /^\d+(\.\d+)?$/.test(q) ? Number(q) : null;
      list = list.filter((p) => {
        if (p.name.toLowerCase().includes(q)) return true;
        if (p.sku.toLowerCase().includes(q)) return true;
        if (asNumber !== null) {
          const { panjangCm, lebarCm, tinggiCm } = p.dimensi ?? {};
          if (panjangCm === asNumber || lebarCm === asNumber || tinggiCm === asNumber) return true;
        }
        return false;
      });
    }
    if (category) list = list.filter((p) => p.category === category);
    if (sort === "price-asc") list = [...list].sort((a, b) => a.hargaRekomendasi - b.hargaRekomendasi);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.hargaRekomendasi - a.hargaRekomendasi);
    // Booked/Sudah DP products sink to the bottom — fully available stock
    // shows first. Per the user's request 2026-08-27. Whatever sort/filter
    // already applied above is preserved within each of the two groups.
    const available = list.filter((p) => !p.bookedQty && !p.dpQty);
    const encumbered = list.filter((p) => p.bookedQty || p.dpQty);
    return [...available, ...encumbered];
  }, [products, search, category, sort]);

  return (
    // Extra bottom padding on mobile (dropped again at md, where the fixed
    // bottom cart bar/tab bar don't exist) so the last row of product cards
    // isn't hidden behind CartBar + the mobile tab bar stacked at the
    // bottom of the screen. Per the user's report 2026-08-25.
    <div className="p-6 pb-32 md:p-9">
      <div className="relative -mx-6 -mt-6 mb-7 overflow-hidden border-b-2 border-line bg-paper px-6 py-10 pl-16 md:-mx-9 md:-mt-9 md:px-10 md:pl-14">
        <div className="mb-2 font-sans text-xs uppercase tracking-[0.12em] text-accent">
          Penjualan
        </div>
        <h1 className="relative max-w-xl font-sans text-[2.3rem] leading-tight font-extrabold">
          Katalog CV HORECA JAYA
        </h1>
        <p className="mt-3 font-sans text-[0.78rem] text-muted">
          STOK TER-UPDATE OTOMATIS · {products.length} PRODUK TERSEDIA
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Link
            href="/katalog/custom-order"
            className="inline-block rounded border border-accent bg-accent px-4.5 py-2.5 font-sans text-[0.85rem] font-semibold text-white"
          >
            Pesan Produk Custom
          </Link>
          <Link
            href="/katalog/custom"
            className="inline-block rounded border border-accent bg-transparent px-4.5 py-2.5 font-sans text-[0.85rem] font-semibold text-accent"
          >
            Lihat Produk Custom
          </Link>
          <button
            type="button"
            onClick={handleMainButtonClick}
            disabled={downloading || (pickMode && selected.size === 0)}
            className="inline-block rounded border border-ink bg-transparent px-4.5 py-2.5 font-sans text-[0.85rem] font-semibold text-ink disabled:opacity-60"
          >
            {mainButtonLabel}
          </button>
          {pickMode && (
            <button
              type="button"
              onClick={cancelPicking}
              className="inline-block px-2 py-2.5 font-sans text-[0.8rem] font-medium text-muted underline underline-offset-2"
            >
              Batal
            </button>
          )}
        </div>
      </div>

      {pickMode && (
        <div className="mb-5 flex flex-wrap items-center gap-4">
          <label className="flex w-fit cursor-pointer items-center gap-2 text-[0.8rem] text-muted select-none">
            <input
              type="checkbox"
              checked={filtered.length > 0 && filtered.every((p) => selected.has(p._id))}
              onChange={() => selectAll(filtered.map((p) => p._id))}
              className="h-4 w-4 accent-accent"
            />
            Pilih Semua ({filtered.length} produk yang tampil)
          </label>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama produk atau kode SKU..."
          className="min-w-[180px] flex-1 rounded border border-line bg-panel px-3.5 py-2.5 font-sans text-[0.85rem]"
        />
        {/* Dropdown + search (SearchableSelect, already used elsewhere in
            the app) instead of a plain <select> — per the user's request
            2026-08-26, easier to find one category among many by typing
            than scrolling a long native dropdown. "" (no filter) is
            represented to the component as the literal ALL_CATEGORIES_LABEL
            option since SearchableSelect's value must be one of its own
            options; translated back to "" on select. */}
        <div className="w-[220px]">
          <SearchableSelect
            value={category || ALL_CATEGORIES_LABEL}
            onChange={(v) => setCategory(v === ALL_CATEGORIES_LABEL ? "" : v)}
            options={[ALL_CATEGORIES_LABEL, ...categories]}
            placeholder={ALL_CATEGORIES_LABEL}
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded border border-line bg-panel px-3.5 py-2.5 font-sans text-[0.78rem] text-ink"
        >
          <option value="">Urutkan: Default</option>
          <option value="price-asc">Harga: Terendah ke Tertinggi</option>
          <option value="price-desc">Harga: Tertinggi ke Terendah</option>
        </select>
      </div>

      {/* Single column below sm — the two price-preset buttons + currency
          input on each ProductCard got noticeably more cramped this
          session, so 2-up was too tight on a phone-width screen. Per the
          user's report 2026-08-25. */}
      <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((p) => (
          <ProductCard
            key={p._id}
            product={p}
            canEdit={canEditProduct}
            onEdit={() => setEditingProductId(p._id)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-10 text-center font-mono text-sm text-muted">
            Tidak ada produk yang cocok.
          </div>
        )}
      </div>

      <EditProductDrawer
        productId={editingProductId}
        categories={categories}
        onClose={() => setEditingProductId(null)}
      />
    </div>
  );
}
