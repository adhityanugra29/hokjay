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
import { toUpperInPlace } from "@/components/ui/Form";
import { useDialog } from "@/components/ui/Dialog";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import KatalogAddMenu from "./KatalogAddMenu";
import { capturePagesToPdf } from "@/lib/pdfExport";
import { formatDateDMY } from "@/lib/format";

// Server-paginated grid: 12 products/batch with infinite scroll. Search (incl. the size-query parser), every sidebar filter, Flash-Sale-first and
// booked/DP/sold-sink-to-bottom all run server-side (lib/katalog.ts queryKatalogProducts / app/api/katalog/route.ts, shared with app/katalog/page.tsx for page 1).
const KATALOG_PAGE_SIZE = 12;
// Debounce before a search/filter/sort change fires a request (each one is now a network round-trip), so fast typing doesn't fire one per keystroke.
const FILTER_DEBOUNCE_MS = 350;

/** Builds the app/api/katalog/route.ts query string from the current search/filters/sort state — shared by the grid fetch and the "Pilih Semua" ids fetch so the two can never target different result sets. */
function buildKatalogParams(
  search: string,
  filters: KatalogFilters,
  sort: string,
  excludeNewStock = false
): URLSearchParams {
  const params = new URLSearchParams();
  if (excludeNewStock) params.set("excludeNewStock", "1");
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
  initialNewStock,
  initialNextCursor,
  totalProductCount,
  categories,
  canEditProduct,
  canFlashSale,
  isOwner,
}: {
  initialProducts: KatalogProduct[];
  /** Products uploaded within NEW_STOCK_DAYS — shown in the "New Stock" section above the grid (TASK-043). Already left out of `initialProducts`. */
  initialNewStock: KatalogProduct[];
  /** null once there's nothing left to load — see queryKatalogProducts()'s own nextCursor. */
  initialNextCursor: number | null;
  /** Total catalog size (unfiltered) — only powers the header's "N PRODUK TERSEDIA"; never affected by search/filter. */
  totalProductCount: number;
  categories: string[];
  /** Manager/Owner/Super Admin only. */
  canEditProduct?: boolean;
  /** Owner/Super Admin only. */
  canFlashSale?: boolean;
  /** Owner role only (not Super Admin) — skips the diskon plafon on each card's inline diskon field. */
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
  // Patches one already-loaded card in place after EditProductDrawer saves (lib/katalog.ts getKatalogProductById); a no-op if it has scrolled out of
  // `items` (router.refresh(), still called alongside, covers that on the next navigation).
  function handleProductSaved(updated: KatalogProduct) {
    setItems((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
    setNewStock((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
  }
  // "New Stock" section (TASK-043): products uploaded within NEW_STOCK_DAYS. Shown only with no search and no active filter; the grid leaves them
  // out then (`showNewStock`) so none appears twice.
  const [newStock, setNewStock] = useState<KatalogProduct[]>(initialNewStock);
  const showNewStock = !search.trim() && countActiveFilters(filters) === 0;
  const [cursor, setCursor] = useState<number | null>(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);
  // Every id matching the current filters with real available stock, fetched when picking starts ("Pilih Semua" needs the complete matching set, not just what's scrolled into view).
  const [availableIds, setAvailableIds] = useState<string[]>([]);
  const isFirstRender = useRef(true);
  // Bumped on every fetch; a response is only applied if this hasn't moved on (e.g. a filter change fired while a "load more" from the old filters was in flight).
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

  // Search/filter/sort -> fresh page 1. Skips the first run: page 1 with empty filters is exactly what the server already rendered.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const seq = ++fetchSeq.current;
    const timer = setTimeout(async () => {
      setLoadingFilters(true);
      try {
        const params = buildKatalogParams(search, filters, sort, showNewStock);
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
      const params = buildKatalogParams(search, filters, sort, showNewStock);
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

  // Infinite scroll: a sentinel div after the grid loads the next batch when it scrolls into view. The observer calls `loadMore` through a ref kept
  // fresh every render so it never reads a stale mount-time `cursor`/`search`/`filters`/`sort`.
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Re-created whenever the sentinel (un)mounts: it only renders while `cursor !== null` and not `downloading`, so an observer created once kept watching a
  // detached div after a search with <=12 results ("cabinet" stuck at 12). A fresh observer also fires immediately if the sentinel is already on-screen,
  // retrying a loadMore that was skipped while a request was in flight.
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
  }, [cursor !== null, downloading, loadingMore, loadingFilters]); // eslint-disable-line react-hooks/exhaustive-deps -- booleans on purpose: re-observe on sentinel mount/unmount and when a request finishes

  // Staged flow: "Buat Katalog" reveals checkboxes + "Pilih Semua" (disabled while 0 selected); once >=1 is checked it relabels to "Unduh Katalog PDF - XX itemnya" and downloads.
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
    // Shown immediately on click (not gated behind the fetch-patch's 2s auto-threshold): a many-page catalog can run long enough to warrant a full-screen "Mohon menunggu".
    showLoading();
    try {
      // The offscreen catalog doc fetches its own data on mount; wait for it instead of producing a near-empty PDF.
      for (let tries = 0; element.dataset.ready !== "true" && tries < 50; tries++) {
        await new Promise((r) => setTimeout(r, 100));
        element = document.getElementById("catalog-print-doc")!;
      }
      if (element.dataset.ready !== "true") {
        await alert("Data katalog belum siap, coba lagi sebentar.");
        return;
      }

      const pdf = await capturePagesToPdf(element);
      if (!pdf) {
        await alert("Tidak ada halaman untuk diunduh.");
        return;
      }
      pdf.save(`Katalog-CV-HORECA-JAYA_${formatDateDMY()}.pdf`);
    } catch (err) {
      // Otherwise html2canvas failures vanish as an unhandled rejection with no visible feedback.
      console.error("Gagal membuat PDF katalog:", err);
      await alert(
        `Gagal membuat PDF katalog: ${err instanceof Error ? err.message : String(err)}\n\nCoba lagi, atau screenshot pesan ini untuk dilaporkan.`
      );
    } finally {
      setDownloading(false);
      hideLoading();
    }
  }


  return (
    <>
      <PageHeader
        title="Katalog CV HORECA JAYA"
        subtitle={`STOK TER-UPDATE OTOMATIS · ${totalProductCount} PRODUK TERSEDIA`}
        actions={
          <>
            <KatalogAddMenu />
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
    {/* Extra bottom padding on mobile (dropped at md) so the last row isn't hidden behind CartBar + the mobile tab bar. */}
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
          onChange={(e) => {
            toUpperInPlace(e.currentTarget);
            setSearch(e.target.value);
          }}
          placeholder="Cari nama produk atau kode SKU..."
          className="min-w-[180px] flex-1 rounded-lg border border-line bg-panel px-3.5 py-2.5 font-sans text-[0.85rem]"
        />
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

      {/* Single column below sm: the price presets + currency input on each ProductCard are too cramped 2-up on a phone. */}
      {/* The grid is swapped for a placeholder (actually unmounted, not CSS-hidden) while a PDF is generated: html2canvas clones the live document on each of its
          ~35+ per-page captures, and every visible card's next/image thumbnail was re-triggering network requests. Nothing visible is lost behind the "Mohon menunggu" overlay. */}
      {downloading ? (
        <div className="py-16 text-center font-mono text-sm text-muted">Menyiapkan PDF...</div>
      ) : (
        <>
          {/* New Stock (TASK-043): products uploaded in the last NEW_STOCK_DAYS days, pinned above the grid; hidden while searching/filtering (they show in the grid
              with their own banner) and when there are none. A swipeable row on phones, the same grid as below from sm up. */}
          {showNewStock && newStock.length > 0 && (
            <section className="mb-7 rounded-2xl border-[1.5px] border-[#16A34A] bg-[#E7F6EC] p-3.5 sm:p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2.5">
                <span className="rounded-full bg-[#16A34A] px-3 py-0.5 font-mono text-[0.68rem] font-semibold tracking-[0.08em] text-white">
                  NEW STOCK
                </span>
                <h2 className="font-sans text-[1rem] font-extrabold">New Stock</h2>
                <span className="font-mono text-[0.68rem] uppercase tracking-[0.08em] text-muted">
                  {newStock.length} produk
                </span>
              </div>
              <div className="flex snap-x snap-mandatory gap-4.5 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3">
                {newStock.map((p) => (
                  <div key={p._id} className="w-[270px] shrink-0 snap-start sm:w-auto">
                    <ProductCard
                      product={p}
                      canEdit={canEditProduct}
                      canFlashSale={canFlashSale}
                      isOwner={isOwner}
                      onEdit={() => setEditingProduct(p)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
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

          {/* Infinite scroll: an IntersectionObserver (above) loads the next batch when this sentinel scrolls into view. */}
          {cursor !== null && (
            <div ref={sentinelRef} className="mt-6 flex justify-center py-4">
              {loadingMore && <span className="font-mono text-[0.78rem] text-muted">Memuat produk lagi...</span>}
            </div>
          )}
        </>
      )}

      <EditProductDrawer
        product={editingProduct}
        onSaved={handleProductSaved}
        categories={categories}
        // Commission settings are Owner-only (narrower than Flash Sale's role set), so this reuses the real Owner-only `isOwner` prop instead of `canFlashSale`.
        isOwner={isOwner}
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
