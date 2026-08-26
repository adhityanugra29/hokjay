"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { rupiah } from "@/lib/format";
import { useCatalogSelection } from "@/components/katalog/CatalogSelectionProvider";

interface CatalogProduct {
  _id: string;
  name: string;
  sku: string;
  category: string;
  kondisi: "baru" | "bekas";
  kondisiPercent?: number;
  hargaRekomendasi: number;
  hargaMinimum: number;
  dimensi?: { panjangCm?: number; lebarCm?: number; tinggiCm?: number };
  ketebalan?: string;
  fotoUrl?: string;
  stok: number;
  isCustom?: boolean;
}

interface CatalogSales {
  _id: string;
  nama: string;
  aktif: boolean;
  nomorHp?: string;
}

// Bright yellow (per the user's request 2026-08-25 — replaces an earlier
// gold/lemon pick). Bright yellow doesn't hold up under white text, so
// every background use below pairs it with dark ink text instead.
const YELLOW = "#FFC800";

// One A4 page's content height in CSS px at this document's own scale: the
// container is 794px wide (≈210mm at 96dpi, matching html2pdf's jsPDF a4
// portrait output), so 297mm of page height maps to 297 * (794/210) ≈ 1123px
// here. Used as the per-page height budget packIntoPages packs products
// against (see below) — not to force every page's rendered height to this
// exact number (that was tried and dropped, see the products section's own
// comment further down).
const PAGE_HEIGHT_PX = Math.round((297 * 794) / 210);

/**
 * Shared "Hubungi ..." wording — used both in the cover's "Pemesanan" cell
 * and the repeating footer's footnote, so the two always read the same.
 * Per the user's request 2026-08-26.
 */
function salesContactLine(ownSales: CatalogSales | undefined): string {
  return ownSales
    ? `Hubungi sales Anda untuk penawaran terbaik: ${ownSales.nama}${ownSales.nomorHp ? ` - ${ownSales.nomorHp}` : ""}`
    : "Hubungi sales Anda untuk penawaran terbaik";
}

// ── Adaptive per-page product count (2026-08-26) ──────────────────────────
// Replaces the old fixed "exactly 3 products per page" chunker. Root cause
// of the original blank/near-empty pages: the cover's real height is
// dynamic (grows with how many categories get listed in "Daftar Isi
// Katalog"), but the old chunker packed a fixed count onto every page
// regardless of how much room the cover left. Packing against a real height
// budget instead means a page always gets as many products as safely fit.
//
// The four *_PX constants below were first written as deliberately
// over-padded guesses, which (per the user's report against a real
// rendered PDF) left ~300px of dead space above the footer on page 1 —
// only 1 product fit a page that visibly had room for 2. Recalibrated here
// against that actual render (image height ≈ page height; footer/category/
// product-row proportions measured directly off it) instead of guessing,
// with only a small margin on top — tight enough to stop wasting a whole
// product's worth of blank space, still enough margin to absorb a
// two-line product name.
const FOOTER_HEIGHT_PX = 130;
const PRODUCTS_CONTAINER_VPAD_PX = 64; // px-12 py-8 on the products wrapper — py-8 = 32px top + 32px bottom, exact (not an estimate).
const CATEGORY_HEADER_PX = 90;
const PRODUCT_ROW_PX = 200;
// Used only for the handful of renders before coverRef's real height lands
// (see coverHeight state below) — generous on purpose so a transient
// under-measurement never lets page 1 overpack before the real number
// arrives.
const DEFAULT_COVER_HEIGHT_PX = 450;

/**
 * Greedily packs the flattened product list into pages, each capped by how
 * much vertical room that page actually has left (page 1 loses `coverHeight`
 * up front, every page loses the footer + container padding). Always places
 * at least one item per page even if it alone exceeds the remaining budget,
 * so an unusually tall single product/category can't stall the packer.
 *
 * Every page's FIRST item always gets billed CATEGORY_HEADER_PX, whether or
 * not it's a genuine new-category start — a category that spans more than
 * one page repeats its heading at the top of each continuation page (see
 * the categoryLabel back-fill after this call), so that heading's height
 * always needs budgeting for, not just at true category boundaries.
 */
function packIntoPages(flat: PrintUnit[], coverHeight: number): PrintUnit[][] {
  const pages: PrintUnit[][] = [];
  let i = 0;
  while (i < flat.length) {
    const isFirstPage = pages.length === 0;
    const budget = PAGE_HEIGHT_PX - PRODUCTS_CONTAINER_VPAD_PX - FOOTER_HEIGHT_PX - (isFirstPage ? coverHeight : 0);
    const page: PrintUnit[] = [];
    let used = 0;
    while (i < flat.length) {
      const isPageStart = page.length === 0;
      const cost = PRODUCT_ROW_PX + (flat[i].categoryLabel || isPageStart ? CATEGORY_HEADER_PX : 0);
      if (page.length > 0 && used + cost > budget) break;
      used += cost;
      page.push(flat[i]);
      i++;
    }
    pages.push(page);
  }
  return pages;
}

function specLine(p: CatalogProduct): string {
  const parts: string[] = [];
  // Just "Bekas"/"Baru" — the kondisiPercent number is dropped from every
  // status label per the user's request 2026-08-25.
  parts.push(p.kondisi === "bekas" ? "Bekas" : "Baru");
  if (p.dimensi?.panjangCm && p.dimensi?.lebarCm && p.dimensi?.tinggiCm) {
    parts.push(`${p.dimensi.panjangCm}×${p.dimensi.lebarCm}×${p.dimensi.tinggiCm} cm`);
  }
  if (p.ketebalan) parts.push(`Tebal ${p.ketebalan}`);
  return parts.join(" · ");
}

/** One print unit in the flattened, chunked product sequence — see chunking below. */
interface PrintUnit {
  product: CatalogProduct;
  /** Category label to print right above this product — only set on the first product of a new category. */
  categoryLabel?: string;
}

/**
 * Page-bottom footer band — logo + sales list + a footnote personalized
 * with the logged-in sales' own name/number when available (mirrors the
 * cover's "Pemesanan" section fallback). Repeats on EVERY product page
 * (rendered once per chunk, right before that chunk's page-break) as a
 * divider between pages, styled with the same yellow background as the
 * cover header. Per the user's request 2026-08-25.
 */
function ClosingFooter({ sales, ownSales }: { sales: CatalogSales[]; ownSales: CatalogSales | undefined }) {
  return (
    <div className="flex items-center gap-6 px-12 py-6" style={{ background: YELLOW, color: "#201e1d" }}>
      {/* Logo pinned to the far left edge, text to its right — per the
          user's request 2026-08-25 (was stacked logo-above-text before). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo/hojay-2b-positif.png" alt="HOJAY Kitchen Equipment" width={90} height={50} className="h-auto w-[90px] shrink-0" />
      <div>
        {sales.length > 0 && (
          <div className="text-[13px] opacity-80">
            Sales yang melayani: <span className="font-semibold">{sales.map((s) => s.nama).join(" · ")}</span>
          </div>
        )}
        <p className="mt-1 text-[13px] leading-relaxed opacity-80">{salesContactLine(ownSales)}</p>
      </div>
    </div>
  );
}

/**
 * Positioned off-screen (not display:none) so html2pdf/html2canvas can
 * render it when "Unduh Katalog (PDF)" is clicked (see KatalogClient) — it
 * needs real layout to snapshot, which display:none elements don't have.
 * Never visible to the user and excluded from native browser printing.
 *
 * This brochure (cover → products, packed per page by remaining height —
 * see packIntoPages — each page closed by a repeating yellow footer band)
 * only includes products checked in
 * the Katalog page's own selection checkboxes (see
 * CatalogSelectionProvider) — separate from the invoice cart — sourced
 * live from the product/category/sales collections.
 */
export default function CatalogPrintDoc({ user }: { user: { nama: string; role: string } | null }) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [sales, setSales] = useState<CatalogSales[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { selected, getEffectivePrice } = useCatalogSelection();

  // selectedProducts/byCategory computed up here (not further down where
  // they used to live) specifically so the coverHeight effect right below
  // can depend on byCategory.length — see that effect's comment.
  const selectedProducts = products.filter((p) => selected.has(p._id));
  const byCategory = categories
    .map((cat) => ({ cat, items: selectedProducts.filter((p) => p.category === cat) }))
    .filter((g) => g.items.length > 0);

  // Measures the cover+stats block's real rendered height so packIntoPages
  // can give page 1's product budget exactly (PAGE_HEIGHT_PX - coverHeight)
  // of room — pages 2+ have no cover eating into their budget, so they just
  // get the full PAGE_HEIGHT_PX.
  //
  // Depends on byCategory.length, not just [loaded] (2026-08-26 fix) — the
  // cover's "Daftar Isi Katalog" list grows/shrinks with how many
  // categories the user has picked on /katalog, so its real height changes
  // every time the selection changes, not just once at initial data load.
  // With only [loaded], this effect fired exactly once — while selected was
  // still empty (nothing picked yet) — captured a short "no categories
  // listed yet" cover height, and never re-measured after the user actually
  // picked products and the cover grew taller. packIntoPages then kept
  // budgeting page 1 against that stale, too-short cover height, silently
  // overpacking it — the actual root cause of the recurring blank/near-empty
  // pages, more products picked (more categories listed) making it worse.
  const coverRef = useRef<HTMLDivElement>(null);
  const [coverHeight, setCoverHeight] = useState<number | null>(null);
  useEffect(() => {
    if (coverRef.current) setCoverHeight(coverRef.current.offsetHeight);
  }, [loaded, byCategory.length]);

  // When a sales rep is logged in and generates their own catalog, the
  // "Pemesanan" section shows their own name + WA number (matched by nama
  // against the Sales roster) instead of the generic line — per the user's
  // request 2026-08-25. Other roles (admin/finance/purchasing) keep the
  // generic text since there's no single "own" sales record for them.
  const ownSales =
    user?.role === "sales"
      ? sales.find((s) => s.nama.trim().toLowerCase() === user.nama.trim().toLowerCase())
      : undefined;

  useEffect(() => {
    // Deliberately invisible: this fetches on every single page load (this
    // component is mounted globally), not something the user is waiting on
    // — opts out of the global "slow fetch shows the loading popup" patch
    // (see components/ui/LoadingOverlay.tsx) via this header, otherwise a
    // slow DB response here would pop up "Mohon menunggu" over whatever
    // page the user is actually looking at.
    const silent = { headers: { "X-Loading-Overlay": "silent" } };
    Promise.all([
      fetch("/api/products", silent).then((r) => r.json()),
      fetch("/api/categories", silent).then((r) => r.json()),
      fetch("/api/sales", silent).then((r) => r.json()),
    ])
      .then(([p, c, s]) => {
        setProducts((p as CatalogProduct[]).filter((x) => !x.isCustom));
        setCategories((c as { name: string }[]).map((x) => x.name));
        setSales((s as CatalogSales[]).filter((x) => x.aktif));
      })
      .finally(() => setLoaded(true));
  }, []);

  // Flatten category groups into one ordered list (category header still
  // marked on each group's first item), then pack into pages by real
  // remaining height instead of a fixed count — see packIntoPages above.
  // A hard page-break is inserted between chunks ("css" pagebreak mode,
  // enabled in KatalogClient, breaks at any element carrying the
  // html2pdf__page-break class).
  const flat: PrintUnit[] = byCategory.flatMap((group) =>
    group.items.map((product, i) => ({ product, categoryLabel: i === 0 ? group.cat : undefined }))
  );
  // Back-fill a repeated category heading onto every page's first product
  // when it's a mid-category continuation (packIntoPages already budgeted
  // CATEGORY_HEADER_PX for this) — per the user's request 2026-08-26, so a
  // category that spans several pages (e.g. "Working Table" across pages
  // 2-4) still shows its name at the top of every one of those pages, not
  // only the first.
  const chunks: PrintUnit[][] = packIntoPages(flat, coverHeight ?? DEFAULT_COVER_HEIGHT_PX).map((page) =>
    page.map((unit, i) => (i === 0 && !unit.categoryLabel ? { ...unit, categoryLabel: unit.product.category } : unit))
  );

  const today = new Date();
  const periodLabel = today.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  return (
    // Clips a normal (static, full-opacity) block down to zero visible
    // footprint via the wrapper's overflow:hidden — html2canvas reads the
    // captured element's own layout, not the wrapper's, so this hides it
    // from the user without any of the tricks (fixed + far offscreen,
    // opacity:0, display:none) that make html2canvas capture it blank.
    <div className="h-0 overflow-hidden print:hidden">
      <div
        id="catalog-print-doc"
        data-ready={loaded ? "true" : "false"}
        className="w-[794px] bg-paper font-sans text-ink"
      >
        {/* Cover — shrunk down (per the user's request 2026-08-25): dropped
            the description paragraph and tightened the padding/heading size
            so this header doesn't eat so much of page 1. Dark text on the
            bright yellow background for real contrast (white doesn't hold
            up against this shade). Wrapped (with the stats grid below) in
            a ref so its real height can be measured — see coverHeight. */}
        <div ref={coverRef}>
        <div className="px-12 py-7" style={{ background: YELLOW, color: "#201e1d" }}>
          <div className="mb-5 flex items-center justify-between gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/hojay-2b-positif.png"
              alt="HOJAY Kitchen Equipment"
              width={160}
              height={89}
              className="h-auto w-[160px]"
            />
            <span className="text-[13px] tracking-[0.12em] uppercase opacity-70">Katalog · {periodLabel}</span>
          </div>
          <h1 className="max-w-[26ch] text-[28px] leading-[1.25] font-extrabold">
            Kitchen Equipment untuk: UMKM, Cafe, Hotel, MBG — Harga Bersahabat
          </h1>
        </div>
        {/* Was a 3-column grid (Pemesanan / Isi katalog / Kategori) — the
            Kategori column got folded into Isi katalog's wording instead
            of standing on its own, per the user's request 2026-08-25. */}
        <div className="grid grid-cols-2 border-b-2 border-line">
          <div className="px-12 py-6">
            <div className="mb-2 text-[12px] tracking-[0.1em] uppercase" style={{ color: YELLOW }}>
              Pemesanan
            </div>
            <div className="text-[15px] leading-relaxed">{salesContactLine(ownSales)}</div>
          </div>
          <div className="border-l border-line px-12 py-6">
            <div className="mb-2 text-[12px] tracking-[0.1em] uppercase" style={{ color: YELLOW }}>
              Daftar Isi Katalog
            </div>
            {/* Real per-category breakdown instead of one aggregate count —
                category names/counts are whatever the user actually picked
                on /katalog, not a fixed list. Per the user's request
                2026-08-25. */}
            <div className="text-[14px] leading-relaxed">
              {byCategory.map((group) => (
                <div key={group.cat}>
                  {group.cat}: {group.items.length} produk
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>

        {/* Products — packed per page by remaining height (packIntoPages),
            not a fixed count. Each chunk after the first starts on a fresh
            page (html2pdf__page-break marker); each individual product row
            stays break-inside-avoid so it's never cut in half.
            No forced min-height/flush-bottom footer here anymore (dropped
            2026-08-26) — a page that got fewer products than the true page
            height budgeted for now just ends after its last product plus
            the footer's own natural margin, instead of being stretched to
            exactly PAGE_HEIGHT_PX. That stretching was meant to keep the
            footer pinned flush to the physical page bottom, but forcing
            EVERY page to precisely PAGE_HEIGHT_PX (a CSS-px estimate) left
            no room for the small per-page rounding that inevitably happens
            once html2canvas/jsPDF re-measure the actual rendered canvas —
            enough accumulated drift across several pages to occasionally
            spill a sliver of content onto a genuinely blank extra page.
            Letting each page be exactly as tall as its real content is
            immune to that: no page can ever round up past a physical page
            boundary it wasn't already safely under. */}
        {chunks.map((chunk, ci) => (
          <Fragment key={ci}>
            {ci > 0 && <div className="html2pdf__page-break" />}
            <div className="px-12 py-8">
              {chunk.map(({ product: p, categoryLabel }) => (
                <Fragment key={p._id}>
                  {categoryLabel && (
                    <div className="mb-4 flex items-baseline justify-between gap-4 border-b-2 border-line pb-3">
                      <h2 className="text-[22px] font-extrabold">{categoryLabel}</h2>
                    </div>
                  )}
                  <div className="mb-5 flex gap-5 break-inside-avoid border-t border-line pt-5">
                    {p.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.fotoUrl}
                        alt={p.name}
                        className="h-[165px] w-[220px] shrink-0 bg-surface object-cover"
                      />
                    ) : (
                      <div className="flex h-[165px] w-[220px] shrink-0 items-center justify-center bg-surface text-[0.75rem] text-muted">
                        Tidak ada foto
                      </div>
                    )}
                    <div className="flex flex-1 flex-col">
                      <h4 className="text-[18px] font-bold">{p.name}</h4>
                      <p className="mt-1.5 text-[13px] leading-snug text-muted">{specLine(p)}</p>
                      <div className="mt-auto flex items-baseline justify-between gap-3 border-t border-line pt-2.5">
                        <span className="text-[11px] text-muted">{p.sku}</span>
                        <span className="text-[19px] font-extrabold">{rupiah(getEffectivePrice(p))}</span>
                      </div>
                    </div>
                  </div>
                </Fragment>
              ))}
            </div>
            <ClosingFooter sales={sales} ownSales={ownSales} />
          </Fragment>
        ))}
        {chunks.length === 0 && <ClosingFooter sales={sales} ownSales={ownSales} />}
      </div>
    </div>
  );
}
