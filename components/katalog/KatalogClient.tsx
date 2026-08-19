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
      <div className="relative -mx-6 -mt-6 mb-7 overflow-hidden border-b border-line bg-linear-to-br from-[#fff3c4] via-[#fff3c4] to-white px-6 py-10 pl-16 md:-mx-9 md:-mt-9 md:px-10 md:pl-14">
        <div
          className="pointer-events-none absolute -top-15 -right-15 h-55 w-55 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(240,165,44,0.25), transparent 70%)" }}
        />
        <h1 className="relative max-w-xl font-serif text-[2.3rem] leading-tight font-semibold">
          Katalog CV HORECA JAYA
        </h1>
        <p className="mt-3 font-mono text-[0.78rem] text-muted">
          STOK TER-UPDATE OTOMATIS · {products.length} PRODUK TERSEDIA
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Link
            href="/katalog/custom-order"
            className="inline-block rounded border border-violet bg-violet px-4.5 py-2.5 font-sans text-[0.85rem] font-medium text-white"
          >
            🛠 Pesan Produk Custom
          </Link>
          <Link
            href="/katalog/custom"
            className="inline-block rounded border border-violet bg-transparent px-4.5 py-2.5 font-sans text-[0.85rem] font-medium text-violet"
          >
            📦 Lihat Produk Custom
          </Link>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama produk atau kode SKU..."
          className="min-w-[180px] flex-1 rounded-full border border-line bg-panel px-3.5 py-2.5 font-sans text-[0.85rem]"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-full border border-line bg-panel px-3.5 py-2.5 font-mono text-[0.78rem] text-ink"
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
          className="rounded-full border border-line bg-panel px-3.5 py-2.5 font-mono text-[0.78rem] text-ink"
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
