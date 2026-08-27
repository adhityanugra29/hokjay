"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProductForm, { type ProductFormValues } from "@/components/produk/ProductForm";

interface RawProduct {
  name: string;
  merk?: string;
  category: string;
  kondisi: "baru" | "bekas";
  kondisiPercent?: number;
  tipeProduk?: "elektronik" | "non-elektronik";
  hargaRekomendasi: number;
  hargaMinimum: number;
  komisiPercent: number;
  stok: number;
  tanggalBarangMasuk?: string;
  stokMinimum?: number;
  alertHariTidakTerjual?: number;
  dimensi?: { panjangCm?: number | null; lebarCm?: number | null; tinggiCm?: number | null };
  ketebalan?: string;
  fotoUrl?: string;
  fotoSampingUrl?: string;
  fotoBelakangUrl?: string;
  deskripsi?: string;
  sku: string;
}

/**
 * "Edit" pencil on a Katalog product card opens this instead of navigating
 * to /produk/[id]/edit — Manager/Owner/Super Admin can fix a data mistake
 * spotted while browsing the catalog without losing their place. Per the
 * user's request 2026-08-27 ("supaya tidak bolak balik" — the user's own
 * follow-up, replacing an earlier navigate-to-Inventory idea). Reuses the
 * exact same ProductForm as Inventory's edit page, fed by the same
 * GET /api/products/[id] + field-mapping ProdukEditPage already does.
 */
export default function EditProductDrawer({
  productId,
  categories,
  onClose,
}: {
  productId: string | null;
  categories: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [product, setProduct] = useState<RawProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Nothing to fetch while closed — and no need to clear `product` here
    // either: it stays stale while unrendered (the component returns null
    // below whenever productId is falsy), and gets reset the moment this
    // effect re-runs for the next productId anyway.
    if (!productId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setProduct(null);
    fetch(`/api/products/${productId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat data produk");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setProduct(data);
      })
      .catch(() => {
        if (!cancelled) setError("Gagal memuat data produk.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [productId, onClose]);

  if (!productId) return null;

  const initial: Partial<ProductFormValues> | undefined = product
    ? {
        name: product.name,
        merk: product.merk ?? "",
        category: product.category,
        kondisi: product.kondisi,
        kondisiPercent: product.kondisiPercent ? String(product.kondisiPercent) : "",
        tipeProduk: product.tipeProduk ?? "non-elektronik",
        hargaRekomendasi: String(product.hargaRekomendasi),
        hargaMinimum: String(product.hargaMinimum),
        komisiPercent: String(product.komisiPercent),
        stok: String(product.stok),
        tanggalBarangMasuk: product.tanggalBarangMasuk ? new Date(product.tanggalBarangMasuk).toISOString().slice(0, 10) : "",
        stokMinimum: String(product.stokMinimum ?? 5),
        alertHariTidakTerjual: String(product.alertHariTidakTerjual ?? ""),
        panjangCm: product.dimensi?.panjangCm ? String(product.dimensi.panjangCm) : "",
        lebarCm: product.dimensi?.lebarCm ? String(product.dimensi.lebarCm) : "",
        tinggiCm: product.dimensi?.tinggiCm ? String(product.dimensi.tinggiCm) : "",
        ketebalan: product.ketebalan ?? "",
        fotoUrl: product.fotoUrl ?? "",
        fotoSampingUrl: product.fotoSampingUrl ?? "",
        fotoBelakangUrl: product.fotoBelakangUrl ?? "",
        deskripsi: product.deskripsi ?? "",
      }
    : undefined;

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
            <h2 className="font-sans text-[1rem] font-extrabold text-ink">{product?.name ?? "Memuat..."}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-9 w-9 cursor-pointer items-center justify-center border border-line text-lg text-ink hover:border-accent hover:text-accent"
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          {loading && <div className="py-10 text-center font-mono text-[0.8rem] text-muted">Memuat data produk...</div>}
          {error && <div className="py-10 text-center font-mono text-[0.8rem] text-danger">{error}</div>}
          {product && (
            <ProductForm
              mode="edit"
              productId={productId}
              categories={categories}
              initial={initial}
              onSuccess={handleSaved}
              onCancel={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
