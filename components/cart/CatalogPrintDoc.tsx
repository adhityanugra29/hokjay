"use client";

import { useEffect, useState } from "react";
import { rupiah } from "@/lib/format";
import { CUSTOM_ORDER_CATEGORIES } from "@/lib/constants";
import { useCatalogSelection } from "@/components/katalog/CatalogSelectionProvider";
import { useActiveCustomer } from "@/components/penjualan/ActiveCustomerProvider";
import Logo from "@/components/layout/Logo";

interface CatalogProduct {
  _id: string;
  name: string;
  sku: string;
  category: string;
  kondisi: "baru" | "bekas";
  kondisiPercent?: number;
  hargaRekomendasi: number;
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
 * This brochure (cover → products by category → custom order pricing →
 * closing CTA) only includes products checked in the Katalog page's own
 * selection checkboxes (see CatalogSelectionProvider) — separate from the
 * invoice cart — sourced live from the product/category/sales collections.
 */
export default function CatalogPrintDoc() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [sales, setSales] = useState<CatalogSales[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { selected } = useCatalogSelection();
  const { activeCustomer } = useActiveCustomer();

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
      <div className="bg-accent px-12 py-14 text-white">
        <div className="mb-10 flex items-center justify-between gap-4">
          <Logo tone="ink" fill />
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
        {activeCustomer && (
          <p className="mt-6 text-[13px] tracking-[0.1em] text-[rgba(255,255,255,0.85)] uppercase">
            Katalog untuk: <span className="font-bold text-white normal-case">{activeCustomer.nama}</span>
          </p>
        )}
      </div>
      <div className="grid grid-cols-3 border-b-2 border-line">
        <div className="px-12 py-6">
          <div className="mb-2 text-[12px] tracking-[0.1em] text-accent uppercase">Pemesanan</div>
          <div className="text-[15px] leading-relaxed">
            {activeCustomer
              ? `${activeCustomer.nama} · ${activeCustomer.whatsapp}`
              : "Hubungi sales Anda untuk daftar harga & pemesanan"}
          </div>
        </div>
        <div className="border-l border-line px-6 py-6">
          <div className="mb-2 text-[12px] tracking-[0.1em] text-accent uppercase">Isi katalog</div>
          <div className="text-[15px] leading-relaxed">
            {selectedProducts.length} produk dipilih
            <br />+ pesanan custom
          </div>
        </div>
        <div className="border-l border-line px-12 py-6">
          <div className="mb-2 text-[12px] tracking-[0.1em] text-accent uppercase">Kategori</div>
          <div className="text-[15px] leading-relaxed">{byCategory.length} kategori produk</div>
        </div>
      </div>

      {/* Products by category */}
      {byCategory.map((group) => (
        <div key={group.cat} className="break-inside-avoid px-12 py-10">
          <div className="mb-6 flex items-baseline justify-between gap-4 border-b-2 border-line pb-4">
            <h2 className="text-[26px] font-extrabold">{group.cat}</h2>
            <span className="text-[11px] tracking-[0.1em] text-accent uppercase">
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
                  <span className="text-[16px] font-extrabold">{rupiah(p.hargaRekomendasi)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Custom order pricing */}
      <div className="break-inside-avoid px-12 py-10">
        <div className="mb-4 flex items-baseline justify-between gap-4 border-b-2 border-line pb-4">
          <h2 className="text-[26px] font-extrabold">Pesanan custom</h2>
          <span className="text-[11px] tracking-[0.1em] text-accent uppercase">Estimasi awal · ukuran bebas</span>
        </div>
        <p className="mt-4 max-w-[64ch] text-[14px] leading-relaxed">
          Sebutkan ukuran, ketebalan pelat, dan jumlah unit — kami hitung estimasi di tempat. Harga di bawah
          adalah titik mulai per unit dasar sebelum penyesuaian dimensi.
        </p>
        <table className="mt-5 w-full border-collapse text-[14px]">
          <thead>
            <tr>
              <th className="border-b-2 border-line py-2 text-left text-[11px] tracking-[0.08em] text-muted uppercase">
                Kategori
              </th>
              <th className="border-b-2 border-line py-2 text-right text-[11px] tracking-[0.08em] text-muted uppercase">
                Mulai dari
              </th>
            </tr>
          </thead>
          <tbody>
            {CUSTOM_ORDER_CATEGORIES.map((c) => (
              <tr key={c.id}>
                <td className="border-b border-line py-3 font-bold">{c.label}</td>
                <td className="border-b border-line py-3 text-right">{rupiah(c.rate)} / unit</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 grid grid-cols-3 gap-8 border-t-2 border-line pt-8">
          {[
            { n: "1", t: "Kirim daftar barang", d: "Sebutkan kode produk dan jumlahnya ke sales Anda." },
            { n: "2", t: "Terima invoice", d: "Rincian ongkir per zona dan tenggat pembayaran." },
            { n: "3", t: "Barang dikirim", d: "Stok siap kirim 1–3 hari kerja, custom 7–14 hari kerja." },
          ].map((s) => (
            <div key={s.n}>
              <div className="text-[30px] leading-none font-extrabold text-accent">{s.n}</div>
              <h5 className="mt-3 mb-2 text-[15px] font-bold">{s.t}</h5>
              <p className="text-[13px] leading-relaxed text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Closing CTA */}
      <div className="break-inside-avoid bg-accent px-12 py-12 text-white">
        <div className="mb-4">
          <Logo tone="ink" fill size="sm" />
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
