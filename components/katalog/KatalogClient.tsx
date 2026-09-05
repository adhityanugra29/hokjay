"use client";

import { useEffect, useRef, useState } from "react";
import ProductCard, { type KatalogProduct } from "./ProductCard";
import EditProductDrawer from "./EditProductDrawer";
import KatalogFilterSidebar, {
  EMPTY_KATALOG_FILTERS,
  countActiveFilters,
  type KatalogFilters,
} from "./KatalogFilterSidebar";
import { useCatalogSelection } from "./CatalogSelectionProvider";
import { useLoadingOverlay } from "@/components/ui/LoadingOverlay";
import { useDialog } from "@/components/ui/Dialog";
import PageHeader from "@/components/layout/PageHeader";
import { Button, LinkButton } from "@/components/ui/Button";

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

// Server-paginated grid (TASK-012, 2026-09-04) — replaces the earlier
// client-side-only GRID_PAGE_SIZE/"Tampilkan Lebih Banyak" cap
// (2026-08-31, which only limited how many ProductCards/images mounted
// at once but still shipped every matching product from the server on
// every load). Per the user's explicit request: limit the actual data
// pull to 12 products/batch, auto-loading more via infinite scroll.
// Filtering/sorting/grouping (search incl. the size-query parser, every
// sidebar filter, Flash-Sale-first, booked/DP/sold-sink-to-bottom) all
// moved server-side — see lib/katalog.ts's queryKatalogProducts() /
// app/api/katalog/route.ts, the single shared implementation both this
// page and app/katalog/page.tsx (page 1) now call.
const KATALOG_PAGE_SIZE = 12;
// Debounce before a search/filter/sort change actually fires a request —
// unlike the old client-side useMemo (instant, since it only touched an
// already-in-memory array), every change now costs a real network
// round-trip, so this keeps fast typing from firing one request per
// keystroke.
const FILTER_DEBOUNCE_MS = 350;

/** Builds the app/api/katalog/route.ts query string from the current search/filters/sort state — shared by the grid fetch and the "Pilih Semua" ids fetch so the two can never target different result sets. */
function buildKatalogParams(search: string, filters: KatalogFilters, sort: string): URLSearchParams {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  for (const cat of filters.categories) params.append("category", cat);
  if (filters.kondisi) params.set("kondisi", filters.kondisi);
  if (filters.tipe) params.set("tipe", filters.tipe);
  if (filters.hargaMin) params.set("hargaMin", filters.hargaMin);
  if (filters.hargaMax) params.set("hargaMax", filters.hargaMax);
  if (filters.hargaBasis) params.set("hargaBasis", filters.hargaBasis);
  if (filters.nama) params.set("nama", filters.nama);
  if (filters.ukuran) params.set("ukuran", filters.ukuran);
  if (filters.produkBaru) params.set("produkBaru", "1");
  if (sort) params.set("sort", sort);
  return params;
}

export default function KatalogClient({
  initialProducts,
  initialNextCursor,
  totalProductCount,
  categories,
  canEditProduct,
  canFlashSale,
  isOwner,
}: {
  initialProducts: KatalogProduct[];
  /** null once there's nothing left to load — see queryKatalogProducts()'s own nextCursor. */
  initialNextCursor: number | null;
  /** Total catalog size (unfiltered) — only powers the header's "N PRODUK TERSEDIA", never affected by search/filter (that text never updated live even before this task). */
  totalProductCount: number;
  categories: string[];
  /** Manager/Owner/Super Admin only. Per the user's request 2026-08-27. */
  canEditProduct?: boolean;
  /** Owner/Super Admin only. Per the user's request 2026-08-29. */
  canFlashSale?: boolean;
  /** Owner role only (not Super Admin) — skips the diskon plafon on each card's inline diskon field. Per the user's request 2026-09-05. */
  isOwner?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<KatalogFilters>(EMPTY_KATALOG_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState("");

  // The grid itself — starts as the server-rendered page 1, grows via
  // infinite scroll, gets replaced wholesale on a search/filter/sort
  // change. `cursor === null` means there's nothing left to load.
  const [items, setItems] = useState<KatalogProduct[]>(initialProducts);
  const [cursor, setCursor] = useState<number | null>(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);
  // Every id matching the current filters with real available stock —
  // fetched fresh only when picking starts (see startPicking below), not
  // on every render: "Pilih Semua" needs the *complete* matching set, not
  // just whatever's been scrolled into view so far.
  const [availableIds, setAvailableIds] = useState<string[]>([]);
  const isFirstRender = useRef(true);
  // Bumped on every fetch — a response is only applied if this hasn't
  // moved on since (e.g. a filter change fired while a "load more" from
  // the previous filter state was still in flight), so a slow, now-stale
  // response can't clobber newer state.
  const fetchSeq = useRef(0);

  const [downloading, setDownloading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<KatalogProduct | null>(null);
  const { selected, selectAll, pickMode, startPicking, cancelPicking } = useCatalogSelection();
  const { show: showLoading, hide: hideLoading } = useLoadingOverlay();
  const { alert } = useDialog();

  async function fetchAvailableIds() {
    const params = buildKatalogParams(search, filters, sort);
    params.set("mode", "ids");
    const res = await fetch(`/api/katalog?${params.toString()}`);
    const data: { ids: string[] } = await res.json();
    setAvailableIds(data.ids);
  }

  // Search/filter/sort -> replace the grid with a fresh page 1. Skips the
  // very first run: page 1 with empty filters is exactly what the server
  // already rendered, so re-fetching it on mount would just be a wasted
  // duplicate request.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const seq = ++fetchSeq.current;
    const timer = setTimeout(async () => {
      setLoadingFilters(true);
      try {
        const params = buildKatalogParams(search, filters, sort);
        params.set("cursor", "0");
        params.set("limit", String(KATALOG_PAGE_SIZE));
        const res = await fetch(`/api/katalog?${params.toString()}`);
        const data: { products: KatalogProduct[]; nextCursor: number | null } = await res.json();
        if (seq !== fetchSeq.current) return;
        setItems(data.products);
        setCursor(data.nextCursor);
        if (pickMode) await fetchAvailableIds();
      } finally {
        if (seq === fetchSeq.current) setLoadingFilters(false);
      }
    }, FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchAvailableIds/pickMode intentionally read fresh via closure, not tracked as deps (would refire this effect on every pick-mode toggle, which isn't a filter change)
  }, [search, filters, sort]);

  async function loadMore() {
    if (cursor === null || loadingMore || loadingFilters) return;
    setLoadingMore(true);
    const seq = ++fetchSeq.current;
    try {
      const params = buildKatalogParams(search, filters, sort);
      params.set("cursor", String(cursor));
      params.set("limit", String(KATALOG_PAGE_SIZE));
      const res = await fetch(`/api/katalog?${params.toString()}`);
      const data: { products: KatalogProduct[]; nextCursor: number | null } = await res.json();
      if (seq !== fetchSeq.current) return;
      setItems((prev) => [...prev, ...data.products]);
      setCursor(data.nextCursor);
    } finally {
      if (seq === fetchSeq.current) setLoadingMore(false);
    }
  }

  // Infinite scroll — a sentinel div after the grid; loads the next batch
  // once it scrolls into view. Per the user's explicit request ("otomatis
  // menarik data baru setelah scroll sudah sampai bawah"). The observer
  // itself is only ever created once (empty deps — no need to tear down
  // and recreate it on every keystroke/state change), so it calls
  // `loadMore` through a ref kept fresh every render rather than closing
  // over the mount-time `loadMore` — closing over it directly would keep
  // reading the initial render's stale `cursor`/`search`/`filters`/`sort`
  // forever, since this effect never re-runs to pick up a new closure.
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreRef.current();
      },
      { rootMargin: "400px" } // start loading a bit before the sentinel is actually on-screen, so scrolling feels continuous
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Staged flow: idle button ("Buat Katalog") -> click reveals checkboxes +
  // "Pilih Semua" (label stays "Buat Katalog", disabled while 0 selected) ->
  // once >=1 item is checked it relabels to "Unduh Katalog PDF - XX itemnya"
  // and now actually triggers the download.
  function handleMainButtonClick() {
    if (!pickMode) {
      startPicking();
      fetchAvailableIds();
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
        await alert("Data katalog belum siap, coba lagi sebentar.");
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
        await alert("Tidak ada halaman untuk diunduh.");
        return;
      }

      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageWidthMM = pdf.internal.pageSize.getWidth();
      const pageHeightMM = pdf.internal.pageSize.getHeight();

      // REVERTED 2026-08-31 — briefly changed this to Promise.all
      // (capture every page "concurrently") on the theory that the
      // sequential loop was serializing work unnecessarily. Wrong: by
      // this point every image is already loaded (awaited above), so
      // there's essentially no I/O left for html2canvas to overlap —
      // it's almost entirely synchronous DOM-clone + canvas-rasterize
      // work, which JS's single thread can't actually run concurrently
      // regardless of how the promises are scheduled. Promise.all just
      // held every page's cloned subtree + canvas in memory at once
      // instead of one at a time, which the user reported made the
      // export slower, not faster. Back to one page fully processed
      // (and released) before the next starts.
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
      await alert(
        `Gagal membuat PDF katalog: ${err instanceof Error ? err.message : String(err)}\n\nCoba lagi, atau screenshot pesan ini untuk dilaporkan.`
      );
    } finally {
      setDownloading(false);
      hideLoading();
    }
  }

  // Search/filter/sort/Flash-Sale-first/booked-sinks-to-bottom are all
  // applied server-side now (lib/katalog.ts's queryKatalogProducts) --
  // `items` already IS the correctly filtered/sorted/grouped page. See
  // the debounced fetch effect above.

  return (
    <>
      {/* Was a bespoke hero block (own header, own font sizes) — the only
          large page in the app not using the shared PageHeader, and its 3
          buttons all carried equal visual weight with no clear primary
          action. Switched to PageHeader + a real solid/ghost hierarchy per
          the user's request 2026-08-30 ("upgrade UI... konsisten"):
          "Pesan Produk Custom" is the one action that isn't already
          reachable from the product cards below, so it stays solid;
          "Lihat Produk Custom" and the PDF export are secondary (ghost). */}
      <PageHeader
        title="Katalog CV HORECA JAYA"
        subtitle={`STOK TER-UPDATE OTOMATIS · ${totalProductCount} PRODUK TERSEDIA`}
        actions={
          <>
            <LinkButton href="/katalog/custom-order">Pesan Produk Custom</LinkButton>
            <LinkButton variant="ghost" href="/katalog/custom">
              Lihat Produk Custom
            </LinkButton>
            <Button
              type="button"
              variant="ghost"
              onClick={handleMainButtonClick}
              disabled={downloading || (pickMode && selected.size === 0)}
            >
              {mainButtonLabel}
            </Button>
            {pickMode && (
              <button
                type="button"
                onClick={cancelPicking}
                className="inline-block px-2 py-2.5 font-sans text-[0.8rem] font-medium text-muted underline underline-offset-2"
              >
                Batal
              </button>
            )}
          </>
        }
      />
    {/* Extra bottom padding on mobile (dropped again at md, where the fixed
        bottom cart bar/tab bar don't exist) so the last row of product cards
        isn't hidden behind CartBar + the mobile tab bar stacked at the
        bottom of the screen. Per the user's report 2026-08-25. */}
    <div className="p-6 pb-32 md:p-9">
      {pickMode && (
        <div className="mb-5 flex flex-wrap items-center gap-4">
          <label className="flex w-fit cursor-pointer items-center gap-2 text-[0.8rem] text-muted select-none">
            <input
              type="checkbox"
              checked={availableIds.length > 0 && availableIds.every((id) => selected.has(id))}
              onChange={() => selectAll(availableIds)}
              className="h-4 w-4 accent-accent"
            />
            Pilih Semua ({availableIds.length} produk tersedia)
          </label>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama produk atau kode SKU..."
          className="min-w-[180px] flex-1 rounded-lg border border-line bg-panel px-3.5 py-2.5 font-sans text-[0.85rem]"
        />
        {/* Replaces the old plain "Semua Kategori" dropdown — opens a
            sidebar with Kategori, Kondisi, Tipe, and Range Harga, all
            defaulting to "Semua". Per the user's request 2026-08-27. */}
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-panel px-3.5 py-2.5 font-sans text-[0.78rem] font-semibold text-ink hover:border-accent hover:text-accent-700"
        >
          Filter
          {countActiveFilters(filters) > 0 && (
            <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent px-1 text-[0.62rem] font-bold text-ink">
              {countActiveFilters(filters)}
            </span>
          )}
        </button>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-lg border border-line bg-panel px-3.5 py-2.5 font-sans text-[0.78rem] text-ink"
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
      {/* Grid swapped out for a plain placeholder while a PDF is actually
          being generated (2026-08-31) — found via a real Playwright capture
          against a production build (not dev mode/Fast Refresh — ruled that
          out first) that every one of html2canvas's ~35+ per-page captures
          was re-triggering network requests for EVERY visible product
          card's next/image thumbnail, not just the off-screen print doc's
          own photos: html2canvas clones the live document on each capture,
          and this heavy, image-dense grid sits in that same document the
          whole time PDF generation runs. With it out of the DOM (not just
          hidden via CSS — actually unmounted, so there's nothing for a
          clone to re-touch) each of those ~35+ clones has far less to
          re-process. The grid was already invisible behind the full-screen
          "Mohon menunggu" overlay during this window anyway, so nothing
          the user could see or interact with is lost. */}
      {downloading ? (
        <div className="py-16 text-center font-mono text-sm text-muted">Menyiapkan PDF...</div>
      ) : (
        <>
          <div className={`grid grid-cols-1 gap-4.5 sm:grid-cols-2 lg:grid-cols-3 ${loadingFilters ? "opacity-50" : ""}`}>
            {items.map((p) => (
              <ProductCard
                key={p._id}
                product={p}
                canEdit={canEditProduct}
                canFlashSale={canFlashSale}
                isOwner={isOwner}
                onEdit={() => setEditingProduct(p)}
              />
            ))}
            {items.length === 0 && !loadingFilters && (
              <div className="col-span-full py-10 text-center font-mono text-sm text-muted">
                Tidak ada produk yang cocok.
              </div>
            )}
          </div>

          {/* Infinite scroll (TASK-012, 2026-09-04) — replaces the old
              "Tampilkan Lebih Banyak" button. This sentinel sits after the
              grid; an IntersectionObserver (set up above) loads the next
              12-product batch the moment it scrolls into view. Per the
              user's explicit request ("otomatis menarik data baru setelah
              scroll sudah sampai bawah"). */}
          {cursor !== null && (
            <div ref={sentinelRef} className="mt-6 flex justify-center py-4">
              {loadingMore && <span className="font-mono text-[0.78rem] text-muted">Memuat produk lagi...</span>}
            </div>
          )}
        </>
      )}

      <EditProductDrawer
        product={editingProduct}
        categories={categories}
        // Reuses the same Owner/Super Admin check as canFlashSale (identical
        // role set — see app/katalog/page.tsx) rather than adding a second,
        // duplicate prop just for this. Per the user's request 2026-09-03.
        isOwner={canFlashSale}
        onClose={() => setEditingProduct(null)}
      />

      <KatalogFilterSidebar
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        categories={categories}
        filters={filters}
        onChange={setFilters}
      />
    </div>
    </>
  );
}
