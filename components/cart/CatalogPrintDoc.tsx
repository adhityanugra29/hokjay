"use client";

import { useEffect, useState } from "react";
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

function specLine(p: CatalogProduct): string {
  const parts: string[] = [];
  parts.push(p.kondisi === "bekas" ? `Bekas — kondisi ${p.kondisiPercent ?? "-"}%` : "Baru");
  if (p.dimensi?.panjangCm && p.dimensi?.lebarCm && p.dimensi?.tinggiCm) {
    parts.push(`${p.dimensi.panjangCm}×${p.dimensi.lebarCm}×${p.dimensi.tinggiCm} cm`);
  }
  if (p.ketebalan) parts.push(`Tebal ${p.ketebalan}`);
  return parts.join(" · ");
}

/**
 * Positioned off-screen (not display:none) so html2pdf/html2canvas can
 * render it when "Unduh Katalog (PDF)" is clicked (see KatalogClient) — it
 * needs real layout to snapshot, which display:none elements don't have.
 * Never visible to the user and excluded from native browser printing.
 *
 * This brochure (cover → products by category → custom order footnote →
 * closing CTA) only includes products checked in the Katalog page's own
 * selection checkboxes (see CatalogSelectionProvider) — separate from the
 * invoice cart — sourced live from the product/category/sales collections.
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
        {/* Cover */}
      <div className="bg-[#D4A017] px-12 py-14 text-white">
        <div className="mb-10 flex items-center justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/hojay-2b-positif.png"
            alt="HOJAY Kitchen Equipment"
            width={220}
            height={122}
            className="h-auto w-[220px]"
          />
          <span className="text-[13px] tracking-[0.12em] text-[rgba(255,255,255,0.85)] uppercase">
            Katalog · {periodLabel}
          </span>
        </div>
        <h1 className="max-w-[14ch] text-[52px] leading-[0.98] font-extrabold">
          Peralatan dapur hotel &amp; restoran
        </h1>
        <p className="mt-6 max-w-[46ch] text-[16px] leading-relaxed text-[rgba(255,255,255,0.9)]">
          Stainless steel berkualitas, stok siap kirim. Ukuran custom bisa dipesan sesuai kebutuhan dapur Anda.
        </p>
      </div>
      <div className="grid grid-cols-3 border-b-2 border-line">
        <div className="px-12 py-6">
          <div className="mb-2 text-[12px] tracking-[0.1em] text-[#D4A017] uppercase">Pemesanan</div>
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
          <div className="mb-2 text-[12px] tracking-[0.1em] text-[#D4A017] uppercase">Isi katalog</div>
          <div className="text-[15px] leading-relaxed">
            {selectedProducts.length} produk dipilih
            <br />+ pesanan custom
          </div>
        </div>
        <div className="border-l border-line px-12 py-6">
          <div className="mb-2 text-[12px] tracking-[0.1em] text-[#D4A017] uppercase">Kategori</div>
          <div className="text-[15px] leading-relaxed">{byCategory.length} kategori produk</div>
        </div>
      </div>

      {/* Products by category — no break-inside-avoid on this outer wrapper
          (only on each individual product card below): a category with
          many products can be taller than a full page, so forcing the
          whole section atomic pushed it entirely onto page 2 and left
          page 1 mostly blank under the cover. Letting the category flow
          across pages (while still protecting each product card from
          being split mid-card) keeps page 1 filled with real content.
          Per the user's report 2026-08-25. */}
      {byCategory.map((group) => (
        <div key={group.cat} className="px-12 py-10">
          <div className="mb-6 flex items-baseline justify-between gap-4 border-b-2 border-line pb-4">
            <h2 className="text-[26px] font-extrabold">{group.cat}</h2>
            <span className="text-[11px] tracking-[0.1em] text-[#D4A017] uppercase">
              {group.items.length} produk · siap stok
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-6">
            {group.items.map((p) => (
              <div key={p._id} className="break-inside-avoid border-t border-line pt-4">
                {p.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.fotoUrl} alt={p.name} className="mb-3 aspect-4/3 w-full bg-surface object-cover" />
                ) : (
                  <div className="mb-3 flex aspect-4/3 w-full items-center justify-center bg-surface text-[0.75rem] text-muted">
                    Tidak ada foto
                  </div>
                )}
                <h4 className="text-[16px] font-bold">{p.name}</h4>
                <p className="mt-1 text-[12.5px] leading-snug text-muted">{specLine(p)}</p>
                <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-line pt-2">
                  <span className="text-[11px] text-muted">{p.sku}</span>
                  <span className="text-[16px] font-extrabold">{rupiah(getEffectivePrice(p))}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Custom order footnote — the full pricing table + 3-step process
          page was dropped per the user's request 2026-08-25; this one-line
          note is all that remains, tucked above the closing CTA. */}
      <div className="break-inside-avoid border-t-2 border-line px-12 py-6">
        <p className="text-[13px] leading-relaxed text-muted">
          Pesanan custom ukuran bebas tersedia — hubungi sales untuk estimasi harga.
        </p>
      </div>

      {/* Closing CTA */}
      <div className="break-inside-avoid bg-[#D4A017] px-12 py-12 text-white">
        <div className="mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/hojay-2b-positif.png"
            alt="HOJAY Kitchen Equipment"
            width={150}
            height={83}
            className="h-auto w-[150px]"
          />
        </div>
        <h2 className="max-w-[26ch] text-[30px] leading-tight font-extrabold">
          Kirim daftar barangmu hari ini, invoice keluar hari ini juga.
        </h2>
        {sales.length > 0 && (
          <div className="mt-6 text-[14px] text-[rgba(255,255,255,0.9)]">
            Sales yang melayani: {sales.map((s) => s.nama).join(" · ")}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
