"use client";

import { useCart } from "@/components/cart/CartProvider";
import { useCatalogSelection } from "./CatalogSelectionProvider";
import ZoomableImage from "./ZoomableImage";
import { CurrencyInput } from "@/components/ui/Form";
import { rupiah } from "@/lib/format";
import { computeLineCommission } from "@/lib/commission";

export interface KatalogProduct {
  _id: string;
  name: string;
  sku: string;
  category: string;
  hargaRekomendasi: number;
  hargaMinimum: number;
  komisiPercent: number;
  komisiNominal: number;
  stok: number;
  kondisi: string;
  kondisiPercent?: number;
  isCustom?: boolean;
  dimensi?: { panjangCm?: number | null; lebarCm?: number | null; tinggiCm?: number | null };
  ketebalan?: string;
  fotoUrl?: string;
  /** Has sold at least once (any StockMovement with alasan "Penjualan") — still pickable, just flagged. */
  sudahTerjual?: boolean;
}

export default function ProductCard({ product }: { product: KatalogProduct }) {
  const { items, addItem, updateItem, removeItem } = useCart();
  const { isSelected, toggle, pickMode, getPriceMode, setPriceMode, customPrices, setCustomPrice, getEffectivePrice } =
    useCatalogSelection();
  const cartItem = items.find((i) => i.productId === product._id);
  const selected = isSelected(product._id);
  const hasCustomPrice = customPrices[product._id] !== undefined;
  // Price toggle (Harga Rekomendasi/Minimum, + manual custom typing) shows
  // on every product card at all times — not just while picking products
  // for the PDF — and this is the price actually used for "+ Tambah ke
  // Invoice" below. Per the user's request 2026-08-25.
  const effectivePrice = getEffectivePrice(product);
  // Live insentif — matches the exact formula used at real invoice time
  // (lib/commission.ts), computed against whatever price is currently
  // showing instead of the static komisiNominal snapshotted at
  // product-save time. Per the user's request 2026-08-25.
  const liveKomisi = computeLineCommission({
    isCustom: product.isCustom,
    kondisi: product.kondisi as "baru" | "bekas",
    hargaJual: effectivePrice,
    hargaMinimum: product.hargaMinimum,
  });

  const dims = product.dimensi;
  const dimText =
    dims && (dims.panjangCm || dims.lebarCm || dims.tinggiCm)
      ? `${dims.panjangCm ?? "—"} x ${dims.lebarCm ?? "—"} x ${dims.tinggiCm ?? "—"} cm (P x L x T)`
      : null;

  const stockStatusLabel = product.stok <= 0 ? "Stok Habis" : `Stok ${product.stok} unit`;
  // Just "Bekas" / "Baru" — the kondisiPercent number was dropped from
  // every status label per the user's request 2026-08-25 (kondisiPercent
  // itself stays on the product / still editable in the form, it's only
  // hidden from this display).
  const kondisiLabel = product.kondisi === "bekas" ? "Bekas" : "Baru";
  const specsText = [
    dimText ? `Dimensi: ${dimText}` : null,
    product.ketebalan ? `Ketebalan: ${product.ketebalan}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  function handleQtyChange(delta: number) {
    if (!cartItem) return;
    const nextQty = cartItem.qty + delta;
    if (nextQty <= 0) {
      removeItem(product._id);
    } else {
      updateItem(product._id, { qty: nextQty });
    }
  }

  return (
    <div className={`flex flex-col overflow-hidden border bg-panel ${pickMode && selected ? "border-accent" : "border-line"}`}>
      <div className="relative flex aspect-4/3 items-center justify-center overflow-hidden bg-surface text-[0.68rem] text-muted">
        {pickMode && (
          <label
            className="absolute top-2.5 left-2.5 z-10 flex h-6 w-6 cursor-pointer items-center justify-center border-2 border-line bg-panel"
            style={selected ? { background: "var(--color-accent)", borderColor: "var(--color-accent)" } : undefined}
            title="Pilih untuk katalog PDF"
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={() => toggle(product._id)}
              className="sr-only"
            />
            {selected && <span className="text-[13px] leading-none font-bold text-white">✓</span>}
          </label>
        )}
        {product.fotoUrl ? (
          <ZoomableImage src={product.fotoUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          "Tidak ada foto"
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        {/* Fixed-height name block + Insentif called out bold/red, matching
            the Hot Products carousel cards (see confirmation 2026-08-20). */}
        <div className="line-clamp-2 min-h-[2.75rem] text-[0.92rem] leading-snug font-medium">{product.name}</div>
        <div className="mt-1.5 flex flex-col gap-1.5">
          <CurrencyInput
            value={String(effectivePrice)}
            onChange={(v) => setCustomPrice(product._id, v ? Number(v) : 0)}
          />
          {/* Two separate preset buttons (per the user's request 2026-08-25,
              replacing the earlier single flip-label toggle) — each picks
              its price directly and discards any manually-typed custom
              price above. Shows on every card at all times (not gated to
              PDF pick mode) since this is also the price used when adding
              to invoice. */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setPriceMode(product._id, "rekomendasi")}
              className={`cursor-pointer border px-2.5 py-1 font-mono text-[0.64rem] font-semibold ${
                getPriceMode(product._id) === "rekomendasi" && !hasCustomPrice
                  ? "border-accent bg-accent text-white"
                  : "border-line text-ink hover:bg-[#f3f2ec]"
              }`}
            >
              Harga Rekomendasi
            </button>
            <button
              type="button"
              onClick={() => setPriceMode(product._id, "minimum")}
              className={`cursor-pointer border px-2.5 py-1 font-mono text-[0.64rem] font-semibold ${
                getPriceMode(product._id) === "minimum" && !hasCustomPrice
                  ? "border-accent bg-accent text-white"
                  : "border-line text-ink hover:bg-[#f3f2ec]"
              }`}
            >
              Harga Minimum
            </button>
          </div>
        </div>
        <div className="mt-2.5 text-[0.72rem] text-muted">
          {product.stok <= 0 ? (
            <span className="text-accent-700">Stok Habis</span>
          ) : (
            <>Stok: <span className="font-medium text-ink">{product.stok}</span> unit</>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {product.isCustom && (
            <span className="border border-accent px-2.5 py-1 text-[0.66rem] font-semibold text-accent">
              Pesanan Custom
            </span>
          )}
          {/* Informational only — still selectable/pickable for the PDF,
              just flags that this isn't an untouched-new item anymore. Per
              the user's request 2026-08-25. */}
          {product.sudahTerjual && (
            <span className="border border-gold px-2.5 py-1 text-[0.66rem] font-semibold text-gold">
              Sudah Terjual
            </span>
          )}
          {/* Just "Bekas"/"Baru" — the kondisiPercent number is dropped
              from the label (still stored/editable on the product itself,
              just not shown here). Filled with a bright color instead of
              the usual neutral outline badge so the status reads at a
              glance. Per the user's request 2026-08-25. */}
          <span
            className="px-2.5 py-1 text-[0.66rem] font-semibold text-white"
            style={{ background: product.kondisi === "bekas" ? "#D97706" : "#16A34A" }}
          >
            {kondisiLabel}
          </span>
        </div>

        <div className="mt-2.5 text-[0.68rem] uppercase tracking-[0.08em] text-muted">Komisi</div>
        <div className="text-[1.05rem] font-extrabold text-accent-700">{rupiah(liveKomisi)}</div>

        {(dimText || product.ketebalan) && (
          <div className="mt-2.5 border-t border-dashed border-line pt-2.5 font-mono text-[0.7rem] leading-relaxed text-muted">
            {dimText && (
              <div>
                <b className="font-medium text-ink">Dimensi:</b> {dimText}
              </div>
            )}
            {product.ketebalan && (
              <div>
                <b className="font-medium text-ink">Ketebalan:</b> {product.ketebalan}
              </div>
            )}
          </div>
        )}

        {cartItem ? (
          <div className="mt-auto flex w-full items-stretch border border-accent">
            <button
              type="button"
              onClick={() => handleQtyChange(-1)}
              className="h-9 w-[38px] cursor-pointer bg-accent text-base font-semibold text-white hover:bg-accent-deep"
              aria-label="Kurangi jumlah"
            >
              −
            </button>
            <span className="flex-1 py-2 text-center font-mono text-[0.95rem] font-semibold text-accent-700">
              {cartItem.qty}
            </span>
            <button
              type="button"
              onClick={() => handleQtyChange(1)}
              disabled={cartItem.qty >= product.stok}
              className="h-9 w-[38px] cursor-pointer bg-accent text-base font-semibold text-white hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Tambah jumlah"
            >
              +
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={product.stok <= 0}
            onClick={() =>
              addItem({
                productId: product._id,
                name: product.name,
                hargaJual: effectivePrice,
                hargaMinimum: product.hargaMinimum,
                hargaRekomendasi: product.hargaRekomendasi,
                komisiNominal: liveKomisi,
                kondisi: product.kondisi as "baru" | "bekas",
                stok: product.stok,
                fotoUrl: product.fotoUrl,
                kondisiLabel,
                stockStatusLabel,
                specsText,
              })
            }
            className="mt-auto w-full cursor-pointer border border-accent bg-accent py-2.5 text-center font-sans text-[0.8rem] font-semibold text-white transition hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-40"
          >
            {product.stok <= 0 ? "Stok Habis" : "+ Tambah ke Invoice"}
          </button>
        )}
      </div>
    </div>
  );
}
