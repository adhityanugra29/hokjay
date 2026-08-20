"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ProductCard, { type KatalogProduct } from "./ProductCard";

export default function KatalogClient({
  products,
  categories,
}: {
  products: KatalogProduct[];
  categories: string[];
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("");
  const [downloading, setDownloading] = useState(false);

  async function downloadCatalogPDF() {
    const element = document.getElementById("catalog-print-doc");
    if (!element) return;

    setDownloading(true);
    try {
      const { default: html2pdf } = await import("html2pdf.js");
      const today = new Date();
      const tanggal = [
        String(today.getDate()).padStart(2, "0"),
        String(today.getMonth() + 1).padStart(2, "0"),
        today.getFullYear(),
      ].join("-");

      await html2pdf()
        .set({
          margin: 10,
          filename: `Katalog-CV-HORECA-JAYA_${tanggal}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(element)
        .save();
    } finally {
      setDownloading(false);
    }
  }

  const filtered = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (category) list = list.filter((p) => p.category === category);
    if (sort === "price-asc") list = [...list].sort((a, b) => a.hargaRekomendasi - b.hargaRekomendasi);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.hargaRekomendasi - a.hargaRekomendasi);
    return list;
  }, [products, search, category, sort]);

  return (
    <div className="p-6 md:p-9">
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
            onClick={downloadCatalogPDF}
            disabled={downloading}
            className="inline-block rounded border border-ink bg-transparent px-4.5 py-2.5 font-sans text-[0.85rem] font-semibold text-ink disabled:opacity-60"
          >
            {downloading ? "Menyiapkan PDF..." : "Unduh Katalog (PDF)"}
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama produk atau kode SKU..."
          className="min-w-[180px] flex-1 rounded border border-line bg-panel px-3.5 py-2.5 font-sans text-[0.85rem]"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded border border-line bg-panel px-3.5 py-2.5 font-sans text-[0.78rem] text-ink"
        >
          <option value="">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
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

      <div className="grid grid-cols-2 gap-4.5 lg:grid-cols-4">
        {filtered.map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-10 text-center font-mono text-sm text-muted">
            Tidak ada produk yang cocok.
          </div>
        )}
      </div>
    </div>
  );
}
