"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ProductCard, { type KatalogProduct } from "./ProductCard";
import { useCatalogSelection } from "./CatalogSelectionProvider";
import { useActiveCustomer } from "@/components/penjualan/ActiveCustomerProvider";

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
  const { selected, selectAll, pickMode, startPicking, cancelPicking } = useCatalogSelection();
  const { activeCustomer } = useActiveCustomer();

  // Staged flow: idle button ("Buat Katalog") -> click reveals checkboxes +
  // "Pilih Semua" (label stays "Buat Katalog", disabled while 0 selected) ->
  // once >=1 item is checked it relabels to "Unduh Katalog PDF - XX itemnya"
  // and now actually triggers the download.
  function handleMainButtonClick() {
    if (!pickMode) {
      startPicking();
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
        alert("Data katalog belum siap, coba lagi sebentar.");
        return;
      }

      const { default: html2pdf } = await import("html2pdf.js");
      const today = new Date();
      const tanggal = [
        String(today.getDate()).padStart(2, "0"),
        String(today.getMonth() + 1).padStart(2, "0"),
        today.getFullYear(),
      ].join("-");

      await html2pdf()
        .set({
          // No extra page margin here — the container is already sized to
          // A4 width (794px ≈ 210mm @ 96dpi) with its own inner padding, so
          // an additional html2pdf margin would push it past the printable
          // width and crop the right edge instead of shrinking to fit.
          margin: 0,
          filename: `Katalog-CV-HORECA-JAYA_${tanggal}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(element)
        .save();
    } catch (err) {
      // html2pdf/html2canvas failures otherwise vanish as an unhandled
      // rejection — no visible feedback beyond the button re-enabling —
      // which is exactly what made this bug hard to report/diagnose.
      console.error("Gagal membuat PDF katalog:", err);
      alert(
        `Gagal membuat PDF katalog: ${err instanceof Error ? err.message : String(err)}\n\nCoba lagi, atau screenshot pesan ini untuk dilaporkan.`
      );
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
        {activeCustomer && (
          <p className="mt-1.5 font-sans text-[0.78rem]">
            Pelanggan: <span className="font-semibold text-ink">{activeCustomer.nama}</span>{" "}
            <Link href="/penjualan" className="text-accent underline underline-offset-2">
              Ganti
            </Link>
          </p>
        )}
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
          <Link
            href="/katalog/request-po"
            className="inline-block rounded border border-line bg-transparent px-4.5 py-2.5 font-sans text-[0.85rem] font-semibold text-muted hover:border-accent hover:text-accent"
          >
            Request Produk PO
          </Link>
          <button
            type="button"
            onClick={handleMainButtonClick}
            disabled={downloading || (pickMode && selected.size === 0)}
            className="inline-block rounded border border-ink bg-transparent px-4.5 py-2.5 font-sans text-[0.85rem] font-semibold text-ink disabled:opacity-60"
          >
            {mainButtonLabel}
          </button>
          {pickMode && (
            <button
              type="button"
              onClick={cancelPicking}
              className="inline-block px-2 py-2.5 font-sans text-[0.8rem] font-medium text-muted underline underline-offset-2"
            >
              Batal
            </button>
          )}
        </div>
      </div>

      {pickMode && (
        <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 text-[0.8rem] text-muted select-none">
          <input
            type="checkbox"
            checked={filtered.length > 0 && filtered.every((p) => selected.has(p._id))}
            onChange={() => selectAll(filtered.map((p) => p._id))}
            className="h-4 w-4 accent-accent"
          />
          Pilih Semua ({filtered.length} produk yang tampil)
        </label>
      )}

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
