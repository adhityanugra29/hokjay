"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ProductForm, { type ProductFormValues } from "@/components/produk/ProductForm";
import type { KatalogProduct } from "./ProductCard";

/**
 * "Edit" pencil on a Katalog product card opens this instead of navigating
 * to /produk/[id]/edit — Manager/Owner/Super Admin can fix a data mistake
 * spotted while browsing the catalog without losing their place. Per the
 * user's request 2026-08-27 ("supaya tidak bolak balik" — the user's own
 * follow-up, replacing an earlier navigate-to-Inventory idea). Reuses the
 * exact same ProductForm as Inventory's edit page.
 *
 * Used to fetch GET /api/products/[id] on open — but that's a real network
 * round trip (plus a cold Vercel function on an infrequently-hit route)
 * every single click, which the user reported as a noticeable delay
 * 2026-08-27. Katalog's own page load already ran Product.find() and has
 * every field this form needs sitting in memory; app/katalog/page.tsx now
 * passes them straight through (only for canEditProduct roles, so no
 * payload cost for anyone who'll never see the pencil) and this component
 * just reads them off the `product` prop it's handed — zero extra fetch,
 * opens instantly.
 */
export default function EditProductDrawer({
  product,
  categories,
  onClose,
}: {
  product: KatalogProduct | null;
  categories: string[];
  onClose: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!product) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [product, onClose]);

  if (!product) return null;

  const initial: Partial<ProductFormValues> = {
    name: product.name,
    merk: product.merk ?? "",
    category: product.category,
    kondisi: product.kondisi as "baru" | "bekas",
    kondisiPercent: product.kondisiPercent ? String(product.kondisiPercent) : "",
    tipeProduk: product.tipeProduk ?? "non-elektronik",
    hargaRekomendasi: String(product.hargaRekomendasi),
    hargaMinimum: String(product.hargaMinimum),
    komisiPercent: String(product.komisiPercent),
    stok: String(product.stok),
    tanggalBarangMasuk: product.tanggalBarangMasuk ? product.tanggalBarangMasuk.slice(0, 10) : "",
    stokMinimum: String(product.stokMinimum ?? 5),
    alertHariTidakTerjual: String(product.alertHariTidakTerjual ?? ""),
    panjangCm: product.dimensi?.panjangCm ? String(product.dimensi.panjangCm) : "",
    lebarCm: product.dimensi?.lebarCm ? String(product.dimensi.lebarCm) : "",
    tinggiCm: product.dimensi?.tinggiCm ? String(product.dimensi.tinggiCm) : "",
    ketebalan: product.ketebalan ?? "",
    dayaListrik: product.dayaListrik ?? "",
    fotoUrl: product.fotoUrl ?? "",
    fotoSampingUrl: product.fotoSampingUrl ?? "",
    fotoBelakangUrl: product.fotoBelakangUrl ?? "",
    deskripsi: product.deskripsi ?? "",
  };

  function handleSaved() {
    onClose();
    router.refresh(); // Katalog's product list is server-fetched — refresh so the edited fields show immediately.
  }

  return (
    <div className="no-print fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto border-l-2 border-ink bg-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-ink bg-surface px-5 py-4">
          <div>
            <div className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-muted">Ubah Produk</div>
            <h2 className="font-sans text-[1rem] font-extrabold text-ink">{product.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-9 w-9 cursor-pointer items-center justify-center border border-line text-lg text-ink hover:border-accent hover:text-accent-700"
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          <ProductForm
            mode="edit"
            productId={product._id}
            categories={categories}
            initial={initial}
            onSuccess={handleSaved}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
