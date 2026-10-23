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
  /** Owner-set top-down price lock — see models/Product.ts. */
  flashSale?: { active: boolean; harga: number };
  // Booked/Sudah DP qty: needed for the same availableQty guard ProductCard.tsx's checkbox uses.
  bookedQty?: number;
  dpQty?: number;
}

interface CatalogSales {
  _id: string;
  nama: string;
  aktif: boolean;
  nomorHp?: string;
}

// Bright yellow; it doesn't hold under white text, so every background use pairs it with dark ink text.
const YELLOW = "#FFC800";

// One A4 page's content height in CSS px: the container is 794px wide (≈210mm at 96dpi, matching jsPDF a4 portrait), so 297mm ≈ 1123px. Used as the
// per-page height budget for packIntoPages AND the fixed height of every page div (each page is captured as its own image, so no drift accumulates).
const PAGE_HEIGHT_PX = Math.round((297 * 794) / 210);
const PAGE_WIDTH_PX = 794;

/** Shared "Hubungi ..." wording for the cover's "Pemesanan" cell and the repeating footer, so the two always read the same. */
function salesContactLine(ownSales: CatalogSales | undefined): string {
  return ownSales
    ? `Hubungi sales Anda untuk penawaran terbaik: ${ownSales.nama}${ownSales.nomorHp ? ` - ${ownSales.nomorHp}` : ""}`
    : "Hubungi sales Anda untuk penawaran terbaik";
}

// Adaptive per-page product count: a page gets as many products as safely fit its real remaining height (page 1 loses the cover's measured height).
// The *_PX constants are deliberately padded above their measured footprint: underfilling a page by a few px is fine, overflowing is not.
const FOOTER_HEIGHT_PX = 110;
const PRODUCTS_CONTAINER_VPAD_PX = 64; // px-12 py-8 on the products wrapper — py-8 = 32px top + 32px bottom, exact.
const CATEGORY_HEADER_PX = 90;
const PRODUCT_ROW_PX = 200;
// Used only until coverRef's real height lands; generous on purpose so a transient under-measurement never lets page 1 overpack.
const DEFAULT_COVER_HEIGHT_PX = 450;

/**
 * Greedily packs the flattened product list into pages capped by each page's real remaining height (page 1 loses `coverHeight`; every page loses the
 * footer + container padding). Always places at least one item per page, so an unusually tall item can't stall the packer. Every page's FIRST item is
 * billed CATEGORY_HEADER_PX: a category spanning pages repeats its heading on each continuation page (see the categoryLabel back-fill after this call).
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
  // Just "Bekas"/"Baru" (no kondisiPercent).
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
 * Fits a product photo whole inside a fixed box (letterboxed, never cropped) using pixel math from the loaded image's naturalWidth/naturalHeight.
 * html2canvas stretches object-fit:cover, blurs CSS background-image, and the min-width/height "cover" polyfill resolves to the image's intrinsic size.
 * Any crop-to-fill also hid the product or the watermark (many source photos are portrait). Trade-off: an uneven grid for portrait photos.
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
 * Page-bottom footer band: logo + a contact line personalized with the logged-in sales' name/number when available. Repeats on EVERY page, pinned to the
 * bottom via the page wrapper's flex-col + mt-auto (safe because every page is its own fixed-height, independently captured image).
 */
function ClosingFooter({ ownSales }: { ownSales: CatalogSales | undefined }) {
  return (
    <div className="mt-auto flex items-center gap-6 px-12 py-6" style={{ background: YELLOW, color: "#201e1d" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo/hojay-2b-positif.png" alt="HOJAY Kitchen Equipment" width={90} height={50} className="h-auto w-[90px] shrink-0" />
      <div>
        <p className="text-[13px] leading-relaxed opacity-80">{salesContactLine(ownSales)}</p>
      </div>
    </div>
  );
}

/**
 * Positioned off-screen via an overflow:hidden wrapper (not display:none) so html2canvas has real layout to snapshot; never visible and excluded from
 * native printing. The brochure (cover → products, packed by remaining height, see packIntoPages) only includes products checked in the Katalog page's
 * selection (CatalogSelectionProvider, separate from the invoice cart). Each page is its own `[data-print-page]` fixed-size div captured as an
 * independent image by KatalogClient (html2canvas + jsPDF): slicing one continuous canvas into pages proved unreliable and let a repeated category
 * heading bleed across a page boundary.
 */
export default function CatalogPrintDoc({ user }: { user: { nama: string; role: string } | null }) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [sales, setSales] = useState<CatalogSales[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { selected, pickMode, getEffectivePrice, getDiscount } = useCatalogSelection();

  // Computed up here so the coverHeight effect can depend on byCategory.length. Availability is re-checked here, not trusted from `selected`: that is a
  // plain id set that can't notice a product going out of stock after it was checked (another rep booked the last unit), and this is the one place
  // everything destined for the PDF funnels through.
  const selectedProducts = products.filter(
    (p) => selected.has(p._id) && Math.max(0, p.stok - (p.bookedQty ?? 0) - (p.dpQty ?? 0)) > 0
  );
  // Flash Sale products get their own section at the top of page 1 (flashSaleSection) instead of their category group.
  const flashSaleProducts = selectedProducts.filter((p) => p.flashSale?.active);
  const byCategory = categories
    .map((cat) => ({
      cat,
      items: selectedProducts.filter((p) => p.category === cat && !p.flashSale?.active),
    }))
    .filter((g) => g.items.length > 0);

  // Measures the cover+stats block's real height so packIntoPages can budget page 1 (pages 2+ get the full height). Depends on byCategory.length, not just
  // [loaded]: the "Daftar Isi Katalog" list grows with the selection, and measuring once (while nothing was picked) left page 1 budgeted against a
  // too-short cover and silently overpacked.
  const coverRef = useRef<HTMLDivElement>(null);
  const [coverHeight, setCoverHeight] = useState<number | null>(null);
  useEffect(() => {
    if (coverRef.current) setCoverHeight(coverRef.current.offsetHeight);
  }, [loaded, byCategory.length]);

  // Same real-height measurement for the "Harga Special" section (page 1 only, after the cover); depends on flashSaleProducts.length for the same reason.
  const flashSaleRef = useRef<HTMLDivElement>(null);
  const [flashSaleHeight, setFlashSaleHeight] = useState(0);
  useEffect(() => {
    setFlashSaleHeight(flashSaleRef.current?.offsetHeight ?? 0);
  }, [loaded, flashSaleProducts.length]);

  // A sales rep (or manager) generating their own catalog gets their name + WA number (matched by nama against the Sales roster) in "Pemesanan";
  // other roles have no single "own" sales record and keep the generic text.
  const ownSales =
    user?.role === "sales" || user?.role === "manager"
      ? sales.find((s) => s.nama.trim().toLowerCase() === user.nama.trim().toLowerCase())
      : undefined;

  useEffect(() => {
    // Deferred until pick-mode starts: this component is mounted in the root layout, so fetching products/categories/sales on every mount made EVERY
    // page load pay for 3 API calls. Fires once (guarded by `loaded`) the first time pickMode flips true, leaving the browsing window to finish before the
    // PDF is downloaded (KatalogClient's wait-for-data-ready poll covers the rare miss). The header opts out of the global "slow fetch shows the loading
    // popup" patch (components/ui/LoadingOverlay.tsx): nobody is waiting on this directly.
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

  // Flatten category groups into one list (category header on each group's first item), then pack by real remaining height.
  const flat: PrintUnit[] = byCategory.flatMap((group) =>
    group.items.map((product, i) => ({ product, categoryLabel: i === 0 ? group.cat : undefined }))
  );
  // Back-fill the category heading onto every page's first product when it's a mid-category continuation (packIntoPages budgeted CATEGORY_HEADER_PX for it).
  // Page 1's preamble is cover + Harga Special, both measured via ref, so packIntoPages just gets their combined height.
  const page1PreambleHeight = (coverHeight ?? DEFAULT_COVER_HEIGHT_PX) + flashSaleHeight;
  const chunks: PrintUnit[][] = packIntoPages(flat, page1PreambleHeight).map((page) =>
    page.map((unit, i) => (i === 0 && !unit.categoryLabel ? { ...unit, categoryLabel: unit.product.category } : unit))
  );

  const today = new Date();
  const periodLabel = today.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  const cover = (
    // Cover: dark text on the bright yellow for contrast; wrapped in a ref so its real height can be measured (coverHeight).
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

  // "Harga Special": dedicated top-of-document section for Flash Sale products (page 1 only, after the cover; height measured via flashSaleRef). Same row
  // layout as a normal product, but with no separate discount layered on the locked price.
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
    // overflow:hidden on the wrapper hides the doc with zero visible footprint while html2canvas still reads the captured element's own layout;
    // fixed/far-offscreen, opacity:0 and display:none all make html2canvas capture it blank.
    <div className="h-0 overflow-hidden print:hidden">
      <div id="catalog-print-doc" data-ready={loaded ? "true" : "false"} className="font-sans text-ink">
        {chunks.length === 0 ? (
          // Nothing selected outside Flash Sale: still emit one page (cover + Harga Special + footer) so the download has something to capture.
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
                        <h2 className="text-[22px] font-extrabold">{categoryLabel.toUpperCase()}</h2>
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
                        {/* Literal hex colors, not Tailwind opacity-modifier classes: html2canvas crashes on the oklab color-mix() those compile to. */}
                        {(() => {
                          const hargaAsli = getEffectivePrice(p);
                          const diskon = getDiscount(p._id);
                          const hargaFinal = Math.max(0, hargaAsli - diskon);
                          return (
                            <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-2.5">
                              <span className="text-[11px] text-muted">{p.sku}</span>
                              <div className="flex flex-col items-end">
                                {diskon > 0 && (
                                  <span className="text-[12px] text-muted line-through">
                                    Harga Normal: {rupiah(hargaAsli)}
                                  </span>
                                )}
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
