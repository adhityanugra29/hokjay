"use client";

import { Fragment, useEffect, useState } from "react";
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

function specLine(p: CatalogProduct): string {
  const parts: string[] = [];
  parts.push(p.kondisi === "bekas" ? `Bekas — kondisi ${p.kondisiPercent ?? "-"}%` : "Baru");
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
 * Positioned off-screen (not display:none) so html2pdf/html2canvas can
 * render it when "Unduh Katalog (PDF)" is clicked (see KatalogClient) — it
 * needs real layout to snapshot, which display:none elements don't have.
 * Never visible to the user and excluded from native browser printing.
 *
 * This brochure (cover → products, exactly 3 per page → closing footer)
 * only includes products checked in the Katalog page's own selection
 * checkboxes (see CatalogSelectionProvider) — separate from the invoice
 * cart — sourced live from the product/category/sales collections.
 */
export default function CatalogPrintDoc({ user }: { user: { nama: string; role: string } | null }) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [sales, setSales] = useState<CatalogSales[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { selected, getEffectivePrice } = useCatalogSelection();

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
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/sales").then((r) => r.json()),
    ])
      .then(([p, c, s]) => {
        setProducts((p as CatalogProduct[]).filter((x) => !x.isCustom));
        setCategories((c as { name: string }[]).map((x) => x.name));
        setSales((s as CatalogSales[]).filter((x) => x.aktif));
      })
      .finally(() => setLoaded(true));
  }, []);

  const selectedProducts = products.filter((p) => selected.has(p._id));
  const byCategory = categories
    .map((cat) => ({ cat, items: selectedProducts.filter((p) => p.category === cat) }))
    .filter((g) => g.items.length > 0);

  // Flatten category groups into one ordered list (category header still
  // marked on each group's first item), then chunk into pages of exactly 3
  // products — per the user's request 2026-08-25 ("1 page itu tolong
  // berisikan 3 produk saja"). A hard page-break is inserted between chunks
  // (html2pdf's "legacy" pagebreak mode, enabled in KatalogClient, breaks at
  // any element carrying the html2pdf__page-break class).
  const flat: PrintUnit[] = byCategory.flatMap((group) =>
    group.items.map((product, i) => ({ product, categoryLabel: i === 0 ? group.cat : undefined }))
  );
  const chunks: PrintUnit[][] = [];
  for (let i = 0; i < flat.length; i += 3) chunks.push(flat.slice(i, i + 3));

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
            up against this shade). */}
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
          <h1 className="max-w-[20ch] text-[32px] leading-[1.1] font-extrabold">
            Peralatan dapur hotel &amp; restoran
          </h1>
        </div>
        <div className="grid grid-cols-3 border-b-2 border-line">
          <div className="px-12 py-6">
            <div className="mb-2 text-[12px] tracking-[0.1em] uppercase" style={{ color: YELLOW }}>
              Pemesanan
            </div>
            {ownSales ? (
              <div className="text-[15px] leading-relaxed">
                {ownSales.nama}
                {ownSales.nomorHp && (
                  <>
                    <br />
                    {ownSales.nomorHp}
                  </>
                )}
              </div>
            ) : (
              <div className="text-[15px] leading-relaxed">Hubungi sales Anda untuk daftar harga & pemesanan</div>
            )}
          </div>
          <div className="border-l border-line px-6 py-6">
            <div className="mb-2 text-[12px] tracking-[0.1em] uppercase" style={{ color: YELLOW }}>
              Isi katalog
            </div>
            <div className="text-[15px] leading-relaxed">
              {selectedProducts.length} produk dipilih
              <br />+ pesanan custom
            </div>
          </div>
          <div className="border-l border-line px-12 py-6">
            <div className="mb-2 text-[12px] tracking-[0.1em] uppercase" style={{ color: YELLOW }}>
              Kategori
            </div>
            <div className="text-[15px] leading-relaxed">{byCategory.length} kategori produk</div>
          </div>
        </div>

        {/* Products — exactly 3 per page. Each chunk after the first starts
            on a fresh page (html2pdf__page-break marker); each individual
            product row stays break-inside-avoid so it's never cut in half.
            The closing footer (sales list + custom-order note) is appended
            directly inside the LAST chunk's own div — not a separate
            section — so it always shares that final page instead of ever
            becoming the sole reason for an extra trailing page. Per the
            user's request 2026-08-25. */}
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

              {ci === chunks.length - 1 && (
                <div className="mt-6 border-t-2 border-line pt-5">
                  {sales.length > 0 && (
                    <div className="text-[13px] text-muted">
                      Sales yang melayani: <span className="font-semibold text-ink">{sales.map((s) => s.nama).join(" · ")}</span>
                    </div>
                  )}
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">
                    Pesanan custom ukuran bebas tersedia — hubungi sales untuk estimasi harga.
                  </p>
                </div>
              )}
            </div>
          </Fragment>
        ))}
        {chunks.length === 0 && (
          <div className="mt-6 border-t-2 border-line px-12 py-8">
            {sales.length > 0 && (
              <div className="text-[13px] text-muted">
                Sales yang melayani: <span className="font-semibold text-ink">{sales.map((s) => s.nama).join(" · ")}</span>
              </div>
            )}
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Pesanan custom ukuran bebas tersedia — hubungi sales untuk estimasi harga.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
