"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { rupiah } from "@/lib/format";
import { computeLineCommission } from "@/lib/commission";

interface SidebarProduct {
  _id: string;
  name: string;
  sku: string;
  category: string;
  hargaRekomendasi: number;
  hargaMinimum: number;
  komisiNominal: number;
  stok: number;
  kondisi: "baru" | "bekas";
  isCustom?: boolean;
  dimensi?: { panjangCm?: number; lebarCm?: number; tinggiCm?: number };
  fotoUrl?: string;
  bookedQty?: number;
  dpQty?: number;
}

const ALL_CATEGORIES_LABEL = "Semua Kategori";
const STATUS_OPTIONS = ["Semua Status", "Tersedia", "Booked", "Sudah DP"];

/**
 * "+ Tambah Produk" while editing an invoice used to navigate away to
 * /katalog, then rely on "Lanjut ke Invoice" to come back — but that
 * button always routes to /invoice/baru (a brand new invoice), never back
 * to the edit page, silently discarding everything already filled in
 * (pelanggan, sales, tanggal, ongkir...). Per the user's report
 * 2026-08-27 ("customernya tereset"). This sidebar replaces that trip
 * entirely for edit mode — products are picked without ever leaving the
 * page. Create mode (/invoice/baru) is unaffected — it still uses the
 * Katalog page, confirmed with the user 2026-08-27.
 *
 * Deliberately compact (small thumbnail, no price-mode toggle) — pick a
 * product at Harga Rekomendasi, adjust price/discount afterward from the
 * item row already in the invoice (ItemRowEditor already supports that).
 */
export default function AddProductSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, addItem, updateItem, removeItem } = useCart();
  const [products, setProducts] = useState<SidebarProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState(STATUS_OPTIONS[0]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      fetch("/api/products?withStatus=1").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([prods, cats]: [SidebarProduct[], { name: string }[]]) => {
        setProducts(prods.filter((p) => !p.isCustom && p.stok > 0));
        setCategories(cats.map((c) => c.name));
      })
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    let list = products;
    const q = search.trim().toLowerCase();
    if (q) {
      const asNumber = /^\d+(\.\d+)?$/.test(q) ? Number(q) : null;
      list = list.filter((p) => {
        if (p.name.toLowerCase().includes(q)) return true;
        if (p.sku.toLowerCase().includes(q)) return true;
        if (asNumber !== null) {
          const { panjangCm, lebarCm, tinggiCm } = p.dimensi ?? {};
          if (panjangCm === asNumber || lebarCm === asNumber || tinggiCm === asNumber) return true;
        }
        return false;
      });
    }
    if (category) list = list.filter((p) => p.category === category);
    if (status === "Tersedia") list = list.filter((p) => !p.bookedQty && !p.dpQty);
    if (status === "Booked") list = list.filter((p) => !!p.bookedQty);
    if (status === "Sudah DP") list = list.filter((p) => !!p.dpQty);
    return list;
  }, [products, search, category, status]);

  if (!open) return null;

  return (
    <div className="no-print fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-sm flex-col overflow-hidden border-l-2 border-ink bg-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-ink bg-surface px-4 py-3.5">
          <h2 className="font-sans text-[0.9rem] font-extrabold text-ink">Tambah Produk</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-8 w-8 cursor-pointer items-center justify-center border border-line text-ink hover:border-accent hover:text-accent"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-2 border-b border-line p-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, SKU, atau ukuran..."
            className="w-full rounded border border-line bg-panel px-3 py-2 font-sans text-[0.8rem]"
          />
          {/* Wraps on a narrow phone instead of squeezing both controls
              into an unusably thin sliver — per the user's request
              2026-08-27 ("pastikan berjalan dengan lancar" di mobile). */}
          <div className="flex flex-wrap gap-2">
            <div className="min-w-[140px] flex-1">
              <SearchableSelect
                value={category || ALL_CATEGORIES_LABEL}
                onChange={(v) => setCategory(v === ALL_CATEGORIES_LABEL ? "" : v)}
                options={[ALL_CATEGORIES_LABEL, ...categories]}
                placeholder={ALL_CATEGORIES_LABEL}
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="min-w-[110px] flex-1 rounded border border-line bg-panel px-2.5 py-2 font-mono text-[0.72rem] text-ink"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading && <div className="py-8 text-center font-mono text-[0.78rem] text-muted">Memuat produk...</div>}
          {!loading && filtered.length === 0 && (
            <div className="py-8 text-center font-mono text-[0.78rem] text-muted">Tidak ada produk yang cocok.</div>
          )}
          <div className="flex flex-col gap-2">
            {filtered.map((p) => {
              const cartItem = items.find((i) => i.productId === p._id);
              // Same "Booked/DP units aren't really free" guard as the main
              // Katalog card — but this invoice's OWN already-added qty is
              // added back first, since it's counted in p.bookedQty/dpQty
              // too (this is a real persisted "unpaid" invoice being
              // edited) and would otherwise wrongly cap against itself.
              // Per the user's request 2026-08-27.
              const availableQty = Math.max(
                0,
                p.stok - (p.bookedQty ?? 0) - (p.dpQty ?? 0) + (cartItem?.qty ?? 0)
              );
              // Live insentif — same formula/inputs as the main Katalog
              // card (lib/commission.ts), computed against the default add
              // price (Harga Rekomendasi) this sidebar adds at. Per the
              // user's request 2026-08-27.
              const liveKomisi = computeLineCommission({
                isCustom: p.isCustom,
                kondisi: p.kondisi,
                hargaJual: p.hargaRekomendasi,
                hargaMinimum: p.hargaMinimum,
              });
              const kondisiLabel = p.kondisi === "bekas" ? "Bekas" : "Baru";
              // Per the user's request 2026-08-27 ("ukuranya itu krusial")
              // — dimensions matter for a sales rep deciding this is the
              // right item, same P x L x T shown on the main Katalog card.
              const dimText =
                p.dimensi?.panjangCm && p.dimensi?.lebarCm && p.dimensi?.tinggiCm
                  ? `${p.dimensi.panjangCm}×${p.dimensi.lebarCm}×${p.dimensi.tinggiCm} cm`
                  : null;
              return (
                <div key={p._id} className="flex items-center gap-2.5 border border-line bg-[#fbfaf5] p-2">
                  <div className="flex h-11 w-11 flex-none items-center justify-center overflow-hidden bg-surface text-[0.55rem] text-muted">
                    {p.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.fotoUrl} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      "—"
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-[0.76rem] font-medium text-ink">{p.name}</div>
                    {dimText && <div className="mt-0.5 font-mono text-[0.62rem] text-muted">{dimText}</div>}
                    <div className="mt-0.5 flex flex-wrap items-center gap-1 font-mono text-[0.64rem] text-muted">
                      <span>{rupiah(p.hargaRekomendasi)}</span>
                      <span
                        className="px-1.5 py-[1px] text-[0.58rem] font-semibold text-white"
                        style={{ background: p.kondisi === "bekas" ? "#D97706" : "#16A34A" }}
                      >
                        {kondisiLabel}
                      </span>
                      <span className="text-moss-deep">Insentif {rupiah(liveKomisi)}</span>
                      {!!p.bookedQty && <span className="text-[#B45309]">· Booked {p.bookedQty}</span>}
                      {!!p.dpQty && <span className="text-[#0369A1]">· DP {p.dpQty}</span>}
                    </div>
                  </div>
                  {cartItem ? (
                    <div className="flex flex-none items-stretch border border-accent">
                      <button
                        type="button"
                        onClick={() =>
                          cartItem.qty <= 1 ? removeItem(p._id) : updateItem(p._id, { qty: cartItem.qty - 1 })
                        }
                        className="h-7 w-7 cursor-pointer bg-accent text-[0.85rem] font-semibold text-white hover:bg-accent-deep"
                      >
                        −
                      </button>
                      <span className="flex w-7 items-center justify-center font-mono text-[0.76rem] font-semibold text-accent-700">
                        {cartItem.qty}
                      </span>
                      <button
                        type="button"
                        disabled={cartItem.qty >= availableQty}
                        onClick={() => updateItem(p._id, { qty: cartItem.qty + 1 })}
                        className="h-7 w-7 cursor-pointer bg-accent text-[0.85rem] font-semibold text-white hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                  ) : availableQty <= 0 ? (
                    <span className="flex-none font-mono text-[0.66rem] text-accent-700">Tidak Tersedia</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        addItem({
                          productId: p._id,
                          name: p.name,
                          hargaJual: p.hargaRekomendasi,
                          hargaMinimum: p.hargaMinimum,
                          hargaRekomendasi: p.hargaRekomendasi,
                          komisiNominal: p.komisiNominal,
                          kondisi: p.kondisi,
                          stok: availableQty,
                          fotoUrl: p.fotoUrl,
                        })
                      }
                      className="flex-none cursor-pointer border border-accent bg-accent px-2.5 py-1.5 font-mono text-[0.7rem] font-semibold text-white hover:bg-accent-deep"
                    >
                      + Tambah
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
