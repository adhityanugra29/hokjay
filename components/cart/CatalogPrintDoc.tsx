"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { rupiah, productDisplayName } from "@/lib/format";
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
  dayaListrik?: string;
  fotoUrl?: string;
  stok: number;
  isCustom?: boolean;
  merk?: string;
  /** Owner-set top-down price lock — see models/Product.ts. Per the user's request 2026-08-29. */
  flashSale?: { active: boolean; harga: number };
  // Booked/Sudah DP qty — needed here (not just for the on-card badges) to
  // compute the same availableQty guard ProductCard.tsx's checkbox uses.
  // Per the user's request 2026-08-31.
  bookedQty?: number;
  dpQty?: number;
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
// container is 794px wide (≈210mm at 96dpi, matching jsPDF's a4 portrait
// output), so 297mm of page height maps to 297 * (794/210) ≈ 1123px here.
// Used two ways: as the per-page height budget packIntoPages packs products
// against, AND as the fixed rendered height of every page div below (see
// "Per-page capture" further down) — every page is now captured as its own
// independent image, so forcing an exact height here is safe (no risk of
// drift accumulating across pages the way it was when the whole document
// was one continuous flow sliced by html2pdf).
const PAGE_HEIGHT_PX = Math.round((297 * 794) / 210);
const PAGE_WIDTH_PX = 794;

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
// A page always gets as many products as safely fit its real remaining
// height (page 1 loses the cover's measured height up front) instead of a
// fixed count per page. The three *_PX constants are deliberately
// safety-padded above their measured real footprint (never trimmed to the
// minimum) so packing stays conservative — underfilling a page by a few px
// of blank space is fine, overflowing past what a page can actually hold
// is not.
const FOOTER_HEIGHT_PX = 110;
const PRODUCTS_CONTAINER_VPAD_PX = 64; // px-12 py-8 on the products wrapper — py-8 = 32px top + 32px bottom, exact.
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
  if (p.dayaListrik) parts.push(`Daya ${p.dayaListrik}`);
  return parts.join(" · ");
}

/** One print unit in the flattened, chunked product sequence — see chunking below. */
interface PrintUnit {
  product: CatalogProduct;
  /** Category label to print right above this product — only set on the first product of a new category. */
  categoryLabel?: string;
}

/**
 * Fits a product photo whole inside a fixed box — no cropping at all.
 * Computed with real pixel numbers from the loaded image's own
 * naturalWidth/naturalHeight (no CSS auto-sizing trick).
 *
 * Went through FOUR "cover" (crop-to-fill) attempts before this, each
 * failing differently once actually tested against a real exported PDF:
 * plain object-fit:cover (html2canvas doesn't reliably honor it — stretched
 * portrait photos, "gepeng", 2026-08-26), a CSS background-image
 * (html2canvas renders that through a lower-fidelity path — visible blur,
 * 2026-08-27), the classic "absolute + min-width/min-height:100% + width/
 * height:auto" cover polyfill (width/height:auto on a replaced element
 * resolves to its own INTRINSIC size per spec before any min-constraint
 * applies — these source photos are up to 1600px against a 220px box, so
 * the crop ended up looking through a tiny window into the image's own far
 * corner, mostly watermark — "watermarknya menutup gambarnya", 2026-08-27),
 * and finally a JS-computed pixel crop anchored bottom-right specifically
 * to protect that corner's watermark — which fixed the watermark issue but
 * exposed the REAL problem underneath: several of these source photos are
 * portrait-oriented (taken vertically, the actual item filling most of the
 * frame), so ANY crop that fills a landscape 220x165 box discards a large
 * vertical slice — bottom-anchoring specifically kept showing the ground/
 * background near the item's base instead of the item itself. Per the
 * user's report 2026-08-27 ("ini masih salah" against a full multi-page
 * PDF where the actual product was barely visible in almost every photo).
 *
 * No amount of crop-anchoring can fix that without sometimes cutting off
 * either the product or the watermark, since both can't be guaranteed to
 * sit inside whatever slice a "fill the box" crop keeps. Fitting the whole
 * photo (letterboxed, not cropped) is the only approach that can't ever
 * cut off part of the actual product or the watermark — the trade-off is a
 * less visually uniform grid (portrait photos leave empty margin on the
 * sides), which is a fair trade for never hiding what's actually for sale.
 */
function ContainedPhoto({
  src,
  alt,
  boxWidth,
  boxHeight,
}: {
  src: string;
  alt: string;
  boxWidth: number;
  boxHeight: number;
}) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  return (
    <div
      className="relative flex shrink-0 items-center justify-center overflow-hidden bg-surface"
      style={{ width: boxWidth, height: boxHeight }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (!img.naturalWidth || !img.naturalHeight) return;
          const scale = Math.min(boxWidth / img.naturalWidth, boxHeight / img.naturalHeight);
          setSize({ width: Math.round(img.naturalWidth * scale), height: Math.round(img.naturalHeight * scale) });
        }}
        style={size ? { width: size.width, height: size.height } : undefined}
      />
    </div>
  );
}

/**
 * Page-bottom footer band — logo + a contact line personalized with the
 * logged-in sales' own name/number when available (mirrors the cover's
 * "Pemesanan" section fallback). Repeats on EVERY page, pinned flush to the
 * true bottom edge via the page wrapper's flex-col + mt-auto (see "Per-page
 * capture" below — safe now that every page is its own fixed-height,
 * independently-captured image). Per the user's request 2026-08-25. The
 * "Sales yang melayani: ..." line (listing every active sales, not just
 * whoever generated this catalog) was dropped 2026-08-26 per the user's
 * request.
 */
function ClosingFooter({ ownSales }: { ownSales: CatalogSales | undefined }) {
  return (
    <div className="mt-auto flex items-center gap-6 px-12 py-6" style={{ background: YELLOW, color: "#201e1d" }}>
      {/* Logo pinned to the far left edge, text to its right — per the
          user's request 2026-08-25 (was stacked logo-above-text before). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo/hojay-2b-positif.png" alt="HOJAY Kitchen Equipment" width={90} height={50} className="h-auto w-[90px] shrink-0" />
      <div>
        <p className="text-[13px] leading-relaxed opacity-80">{salesContactLine(ownSales)}</p>
      </div>
    </div>
  );
}

/**
 * Positioned off-screen (not display:none) so html2canvas can render it
 * when "Unduh Katalog (PDF)" is clicked (see KatalogClient) — it needs real
 * layout to snapshot, which display:none elements don't have. Never
 * visible to the user and excluded from native browser printing.
 *
 * This brochure (cover → products, packed per page by remaining height —
 * see packIntoPages) only includes products checked in the Katalog page's
 * own selection checkboxes (see CatalogSelectionProvider) — separate from
 * the invoice cart — sourced live from the product/category/sales
 * collections.
 *
 * Per-page capture (2026-08-26): each page below is its own `[data-print-
 * page]`-tagged, fixed-size (PAGE_WIDTH_PX × PAGE_HEIGHT_PX) div, captured
 * as its own independent image by KatalogClient's download handler (via
 * html2canvas + jsPDF directly, not html2pdf.js's automatic multi-page
 * slicing). Rebuilt this way after repeated reports of a repeated category
 * heading bleeding across a page boundary — html2pdf.js slices ONE
 * continuous captured canvas into pages using computed pixel positions,
 * which proved unreliable to pin exactly on our own page boundaries no
 * matter how much buffer space was added around the marker. Capturing each
 * page as a wholly separate image sidesteps that class of bug entirely:
 * there's no shared canvas to slice, so nothing can bleed from one page's
 * capture into another's.
 */
export default function CatalogPrintDoc({ user }: { user: { nama: string; role: string } | null }) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [sales, setSales] = useState<CatalogSales[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { selected, pickMode, getEffectivePrice, getDiscount } = useCatalogSelection();

  // selectedProducts/byCategory computed up here (not further down where
  // they used to live) specifically so the coverHeight effect right below
  // can depend on byCategory.length — see that effect's comment.
  //
  // Also re-checked for availability here, not just trusted from `selected`
  // — per the user's request 2026-08-31 ("hanya boleh checklist produk yang
  // tersedia, pastikan ya"). ProductCard.tsx's checkbox already blocks
  // picking an unavailable product, but `selected` is a plain id set that
  // can't itself notice a product going out of stock after it was checked
  // (e.g. another sales rep booked the last unit in between); this is the
  // one place everything actually destined for the PDF funnels through, so
  // it's the authoritative guard regardless of how an id got into `selected`.
  const selectedProducts = products.filter(
    (p) => selected.has(p._id) && Math.max(0, p.stok - (p.bookedQty ?? 0) - (p.dpQty ?? 0)) > 0
  );
  // Flash Sale products get their own dedicated section at the very top of
  // page 1 (see flashSaleSection below) instead of sitting in their normal
  // category group — per the user's request 2026-08-29 ("saya mau ini di
  // taro paling atas"). Pulled out here so byCategory doesn't also list
  // them a second time.
  const flashSaleProducts = selectedProducts.filter((p) => p.flashSale?.active);
  const byCategory = categories
    .map((cat) => ({
      cat,
      items: selectedProducts.filter((p) => p.category === cat && !p.flashSale?.active),
    }))
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
  // overpacking it.
  const coverRef = useRef<HTMLDivElement>(null);
  const [coverHeight, setCoverHeight] = useState<number | null>(null);
  useEffect(() => {
    if (coverRef.current) setCoverHeight(coverRef.current.offsetHeight);
  }, [loaded, byCategory.length]);

  // Same real-height-measurement approach as coverHeight above, for the
  // "Harga Special" section (see flashSaleSection below) — it only ever
  // sits on page 1, right after the cover, so its height also has to be
  // budgeted out of page 1's product allowance. Depends on
  // flashSaleProducts.length for the same reason coverHeight depends on
  // byCategory.length: the section's real height changes as the selection
  // changes, not just once at initial load.
  const flashSaleRef = useRef<HTMLDivElement>(null);
  const [flashSaleHeight, setFlashSaleHeight] = useState(0);
  useEffect(() => {
    setFlashSaleHeight(flashSaleRef.current?.offsetHeight ?? 0);
  }, [loaded, flashSaleProducts.length]);

  // When a sales rep (or a manager — "mereka sales juga, tapi diberikan
  // otoritas lebih", 2026-08-27) is logged in and generates their own
  // catalog, the "Pemesanan" section shows their own name + WA number
  // (matched by nama against the Sales roster) instead of the generic line
  // — per the user's request 2026-08-25. Other roles (admin/finance/
  // purchasing) keep the generic text since there's no single "own" sales
  // record for them.
  const ownSales =
    user?.role === "sales" || user?.role === "manager"
      ? sales.find((s) => s.nama.trim().toLowerCase() === user.nama.trim().toLowerCase())
      : undefined;

  useEffect(() => {
    // Deferred until pick-mode actually starts (2026-08-31, per the user's
    // demand that opening ANY page — not just /katalog — be fast). This
    // component is mounted globally in the root layout (app/layout.tsx),
    // so unconditionally fetching all products/categories/sales on every
    // single mount meant EVERY page load in the whole app paid for 3 API
    // calls this component's own PDF export doesn't need until someone
    // actually starts picking products for a catalog. Now it only fires
    // once (guarded by `loaded`, same "fetch once" semantics as before —
    // this never re-fetches on a later cancelPicking()/startPicking()
    // cycle either, matching the old empty-deps behavior), the first time
    // pickMode flips true — giving it the whole browsing-and-checking-
    // boxes window to finish well before "Unduh Katalog PDF" is ever
    // clicked (KatalogClient.tsx's own wait-for-data-ready poll in
    // downloadCatalogPDF still covers the rare case it hasn't).
    //
    // Deliberately invisible even now: opts out of the global "slow fetch
    // shows the loading popup" patch (see components/ui/LoadingOverlay.tsx)
    // via this header, since this still isn't something the user is
    // directly waiting on the moment pickMode flips.
    if (!pickMode || loaded) return;
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
  }, [pickMode, loaded]);

  // Flatten category groups into one ordered list (category header still
  // marked on each group's first item), then pack into pages by real
  // remaining height instead of a fixed count — see packIntoPages above.
  const flat: PrintUnit[] = byCategory.flatMap((group) =>
    group.items.map((product, i) => ({ product, categoryLabel: i === 0 ? group.cat : undefined }))
  );
  // Back-fill a repeated category heading onto every page's first product
  // when it's a mid-category continuation (packIntoPages already budgeted
  // CATEGORY_HEADER_PX for this) — per the user's request 2026-08-26, so a
  // category that spans several pages (e.g. "Working Table" across pages
  // 2-4) still shows its name at the top of every one of those pages, not
  // only the first.
  // Page 1's preamble is cover + Harga Special section combined — both
  // measured via ref (see coverHeight/flashSaleHeight above), so
  // packIntoPages doesn't need to know there are now two blocks instead
  // of one, just their combined height.
  const page1PreambleHeight = (coverHeight ?? DEFAULT_COVER_HEIGHT_PX) + flashSaleHeight;
  const chunks: PrintUnit[][] = packIntoPages(flat, page1PreambleHeight).map((page) =>
    page.map((unit, i) => (i === 0 && !unit.categoryLabel ? { ...unit, categoryLabel: unit.product.category } : unit))
  );

  const today = new Date();
  // Includes the day, not just month/year — per the user's request 2026-08-27.
  const periodLabel = today.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  const cover = (
    // Cover — shrunk down (per the user's request 2026-08-25): dropped the
    // description paragraph and tightened the padding/heading size so this
    // header doesn't eat so much of page 1. Dark text on the bright yellow
    // background for real contrast (white doesn't hold up against this
    // shade). Wrapped in a ref so its real height can be measured — see
    // coverHeight.
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
          Kitchen Equipment untuk: UMKM, Cafe, Hotel — Harga Bersahabat
        </h1>
      </div>
      {/* Was a 3-column grid (Pemesanan / Isi katalog / Kategori) — the
          Kategori column got folded into Isi katalog's wording instead of
          standing on its own, per the user's request 2026-08-25. */}
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
              category names/counts are whatever the user actually picked on
              /katalog, not a fixed list. Per the user's request 2026-08-25. */}
          <div className="text-[14px] leading-relaxed">
            {byCategory.map((group) => (
              <div key={group.cat}>
                {group.cat}: {group.items.length} produk
              </div>
            ))}
            {flashSaleProducts.length > 0 && <div>Harga Special: {flashSaleProducts.length} produk</div>}
          </div>
        </div>
      </div>
    </div>
  );

  // "Harga Special" — dedicated top-of-document section for Flash Sale
  // products, per the user's request 2026-08-29 ("saya mau ini di taro
  // paling atas") and their explicit wording choice ("teks saja tulisan
  // 'Harga Special'", not a colored banner). Same row layout as a normal
  // product (photo/name/specLine/price) for visual consistency and code
  // reuse, just under this heading instead of a category name, and with
  // no coret/diskon treatment — a locked Flash Sale price has no separate
  // discount layered on it (see ProductCard.tsx). Only rendered on page 1,
  // right after the cover — its real height is measured via
  // flashSaleRef/flashSaleHeight above so packIntoPages budgets page 1's
  // remaining room correctly.
  const flashSaleSection =
    flashSaleProducts.length > 0 ? (
      <div ref={flashSaleRef} className="px-12 pt-6">
        <div className="mb-4 flex items-baseline justify-between gap-4 border-b-2 border-line pb-3">
          <h2 className="text-[22px] font-extrabold">Harga Special</h2>
        </div>
        {flashSaleProducts.map((p) => (
          <div key={p._id} className="mb-5 flex gap-5 border-t border-line pt-5">
            {p.fotoUrl ? (
              <ContainedPhoto src={p.fotoUrl} alt={p.name} boxWidth={220} boxHeight={165} />
            ) : (
              <div className="flex h-[165px] w-[220px] shrink-0 items-center justify-center bg-surface text-[0.75rem] text-muted">
                Tidak ada foto
              </div>
            )}
            <div className="flex flex-1 flex-col">
              <h4 className="text-[18px] font-bold">{productDisplayName(p.name, p.merk)}</h4>
              <p className="mt-1.5 text-[13px] leading-snug text-muted">{specLine(p)}</p>
              {/* Same treatment as the regular Diskon block below (coret
                  harga normal, harga akhir berwarna, baris Hemat) — per
                  the user's request 2026-08-29 ("samakan treatmentnya
                  dengan diskon"). The only real difference is the labels
                  ("Harga Special" instead of a bare final price) and that
                  the savings here tend to be larger. */}
              {(() => {
                const hargaNormal = p.hargaRekomendasi;
                const hargaSpecial = p.flashSale?.harga ?? 0;
                const hemat = Math.max(0, hargaNormal - hargaSpecial);
                return (
                  <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-2.5">
                    <span className="text-[11px] text-muted">{p.sku}</span>
                    <div className="flex flex-col items-end">
                      <span className="text-[12px] text-muted line-through">Harga Normal: {rupiah(hargaNormal)}</span>
                      <span className="text-[19px] font-extrabold" style={{ color: "#ec3013" }}>
                        Harga Special: {rupiah(hargaSpecial)}
                      </span>
                      <span className="text-[11px] font-bold" style={{ color: "#B45309" }}>
                        Hemat: {rupiah(hemat)}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        ))}
      </div>
    ) : null;

  return (
    // Clips a normal (static, full-opacity) block down to zero visible
    // footprint via the wrapper's overflow:hidden — html2canvas reads the
    // captured element's own layout, not the wrapper's, so this hides it
    // from the user without any of the tricks (fixed + far offscreen,
    // opacity:0, display:none) that make html2canvas capture it blank.
    <div className="h-0 overflow-hidden print:hidden">
      <div id="catalog-print-doc" data-ready={loaded ? "true" : "false"} className="font-sans text-ink">
        {chunks.length === 0 ? (
          // Nothing selected outside Flash Sale (chunks only tracks the
          // category-grouped flat list) — still emit a single page
          // (cover + Harga Special, if any + footer) so the download flow
          // has at least one page to capture.
          <div
            data-print-page={0}
            className="flex flex-col bg-paper"
            style={{ width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX, overflow: "hidden" }}
          >
            {cover}
            {flashSaleSection}
            <ClosingFooter ownSales={ownSales} />
          </div>
        ) : (
          chunks.map((chunk, ci) => (
            <div
              key={ci}
              data-print-page={ci}
              className="flex flex-col bg-paper"
              style={{ width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX, overflow: "hidden" }}
            >
              {ci === 0 && cover}
              {ci === 0 && flashSaleSection}
              <div className="px-12 py-8">
                {chunk.map(({ product: p, categoryLabel }) => (
                  <Fragment key={p._id}>
                    {categoryLabel && (
                      <div className="mb-4 flex items-baseline justify-between gap-4 border-b-2 border-line pb-3">
                        <h2 className="text-[22px] font-extrabold">{categoryLabel}</h2>
                      </div>
                    )}
                    <div className="mb-5 flex gap-5 border-t border-line pt-5">
                      {p.fotoUrl ? (
                        <ContainedPhoto src={p.fotoUrl} alt={p.name} boxWidth={220} boxHeight={165} />
                      ) : (
                        <div className="flex h-[165px] w-[220px] shrink-0 items-center justify-center bg-surface text-[0.75rem] text-muted">
                          Tidak ada foto
                        </div>
                      )}
                      <div className="flex flex-1 flex-col">
                        <h4 className="text-[18px] font-bold">{productDisplayName(p.name, p.merk)}</h4>
                        <p className="mt-1.5 text-[13px] leading-snug text-muted">{specLine(p)}</p>
                        {/* Harga coret + nilai diskon — per the user's
                            request 2026-08-29. Plain `line-through` text
                            decoration and a literal hex color, not a
                            Tailwind opacity-modifier class — this doc gets
                            captured by html2canvas, which has crashed
                            before on the oklab color-mix() those compile
                            to (see the ContainedPhoto doc comment above
                            for the same lesson learned the hard way). */}
                        {(() => {
                          const hargaAsli = getEffectivePrice(p);
                          const diskon = getDiscount(p._id);
                          const hargaFinal = Math.max(0, hargaAsli - diskon);
                          return (
                            <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-2.5">
                              <span className="text-[11px] text-muted">{p.sku}</span>
                              <div className="flex flex-col items-end">
                                {/* "Harga Normal: " label — per the
                                    user's request 2026-08-29. */}
                                {diskon > 0 && (
                                  <span className="text-[12px] text-muted line-through">
                                    Harga Normal: {rupiah(hargaAsli)}
                                  </span>
                                )}
                                {/* Red when discounted — per the user's
                                    request 2026-08-29. Literal hex (this
                                    app's own accent red), not a Tailwind
                                    color class, for the same html2canvas/
                                    color-mix reason as everywhere else in
                                    this file. */}
                                <span
                                  className="text-[19px] font-extrabold"
                                  style={diskon > 0 ? { color: "#ec3013" } : undefined}
                                >
                                  {rupiah(hargaFinal)}
                                </span>
                                {diskon > 0 && (
                                  <span className="text-[11px] font-bold" style={{ color: "#B45309" }}>
                                    Hemat {rupiah(diskon)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </Fragment>
                ))}
              </div>
              <ClosingFooter ownSales={ownSales} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
