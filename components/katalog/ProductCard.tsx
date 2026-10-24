"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { useCatalogSelection } from "./CatalogSelectionProvider";
import ProductCardPhoto from "./ProductCardPhoto";
import ProductCardPricing from "./ProductCardPricing";
import { rupiah, productDisplayName } from "@/lib/format";
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
  /** Effective bekas rate (%), already resolved product override -> category default -> 10% (resolveKomisiBekasPercent). Sent to every viewer; drives the live commission preview. */
  komisiBekasPercent?: number;
  /** The RAW per-product override (undefined if none) — only populated for Owner/Super Admin; feeds the edit form so it shows the stored value, not the resolved one. */
  komisiBekasOverride?: number;
  isCustom?: boolean;
  dimensi?: { panjangCm?: number | null; lebarCm?: number | null; tinggiCm?: number | null };
  ketebalan?: string;
  dayaListrik?: string;
  fotoUrl?: string;
  /** Added recently and never sold — see lib/katalog.ts's getProdukBaruIds. Powers the Filter sidebar's "Hanya Produk Baru" checkbox. */
  isBaru?: boolean;
  /** Uploaded within NEW_STOCK_DAYS (lib/constants.ts) — shows the green "New Stock" banner (TASK-043). Not the same as kondisi Baru/Bekas. */
  isNewStock?: boolean;
  // Only populated when the viewer can edit products: feeds EditProductDrawer directly with no separate fetch, so the pencil opens instantly.
  merk?: string;
  tipeProduk?: "elektronik" | "non-elektronik";
  tanggalBarangMasuk?: string;
  stokMinimum?: number;
  alertHariTidakTerjual?: number;
  fotoSampingUrl?: string;
  fotoBelakangUrl?: string;
  deskripsi?: string;
  // Booked / Sudah DP / SOLD (lib/katalog.ts). Informational only: still stok > 0 and pickable (a booking doesn't reserve stock).
  bookedQty?: number;
  bookedBy?: string[];
  dpQty?: number;
  dpBy?: string[];
  /** Total units ever sold (paid), lifetime — replaces the old plain "Sudah Terjual" boolean. */
  soldQty?: number;
  /** Owner-set top-down price lock — see models/Product.ts. */
  flashSale?: { active: true; harga: number };
}

export default function ProductCard({
  product,
  canEdit,
  canFlashSale,
  isOwner,
  onEdit,
}: {
  product: KatalogProduct;
  /** Manager/Owner/Super Admin only — shows the pencil that opens the inline edit drawer. */
  canEdit?: boolean;
  /** Owner/Super Admin only — shows the Flash Sale button. */
  canFlashSale?: boolean;
  /** Owner role only (narrower than canFlashSale) — skips the diskon plafon entirely. */
  isOwner?: boolean;
  onEdit?: () => void;
}) {
  const { items, addItem, updateItem, removeItem } = useCart();
  const { isSelected, toggle, pickMode, getEffectivePrice, getDiscount } = useCatalogSelection();
  const cartItem = items.find((i) => i.productId === product._id);
  const selected = isSelected(product._id);
  // Diskon and Detail Spesifikasi are collapsed by default to declutter the card; Diskon auto-opens when the line already has a saved discount.
  const [detailOpen, setDetailOpen] = useState(false);
  // Flash Sale: top-down price lock set by owner/super_admin (server enforced, app/api/products/[id]/flash-sale/route.ts). While active this card offers no
  // other price: no presets, no custom price, no Diskon.
  const flashSaleActive = !!product.flashSale?.active;
  // The New Stock banner shares the photo's top edge with the Flash Sale banner (Flash Sale wins); either nudges the checkbox/pencil/kondisi pill down.
  const newStockBanner = !!product.isNewStock && !flashSaleActive;
  const bannerActive = flashSaleActive || newStockBanner;
  // The Rekomendasi/Bottom toggle (+ manual typing) shows on every card and is the price used for "+ Tambah ke Invoice"; an active Flash Sale overrides it.
  const effectivePrice = flashSaleActive ? (product.flashSale?.harga ?? 0) : getEffectivePrice(product);
  // Diskon is separate from the price (what the customer pays) and also reduces komisi; forced to 0 during a Flash Sale.
  const discount = flashSaleActive ? 0 : getDiscount(product._id);
  const finalPrice = Math.max(0, effectivePrice - discount);
  // Live insentif: the same formula as at invoice time (lib/commission.ts; authoritative save-time calc in createInvoice/updateInvoice.ts), on the shown price
  // minus diskon. Flash Sale gets its own flat 7%.
  const liveKomisi = computeLineCommission({
    isCustom: product.isCustom,
    kondisi: product.kondisi as "baru" | "bekas",
    hargaJual: effectivePrice,
    diskon: discount,
    hargaMinimum: product.hargaMinimum,
    isFlashSale: flashSaleActive,
    komisiBekasPercent: product.komisiBekasPercent,
  });

  const dims = product.dimensi;
  const dimText =
    dims && (dims.panjangCm || dims.lebarCm || dims.tinggiCm)
      ? `${dims.panjangCm ?? "—"} x ${dims.lebarCm ?? "—"} x ${dims.tinggiCm ?? "—"} cm (P x L x T)`
      : null;
  // Small on-photo footnote, e.g. "120cm x 80cm x 60cm". Not part of the Katalog PDF: Tailwind bg-ink/NN compiles to oklab color-mix(), which html2canvas
  // can't parse and crashed PDF generation.
  const photoLabelText =
    dims?.panjangCm && dims?.lebarCm && dims?.tinggiCm
      ? `${dims.panjangCm}cm x ${dims.lebarCm}cm x ${dims.tinggiCm}cm`
      : null;

  // Stok committed to a Booked/Sudah DP invoice doesn't leave the shelf until payment (payInvoice.ts), but showing raw stok would let a rep promise units
  // already spoken for. Display/qty-cap guard only, not a reservation; the card disappears only when stok is truly 0.
  const availableQty = Math.max(0, product.stok - (product.bookedQty ?? 0) - (product.dpQty ?? 0));
  const stockStatusLabel = availableQty <= 0 ? "Tidak Tersedia" : `Tersedia ${availableQty} unit`;
  // Just "Bekas" / "Baru" (kondisiPercent stays on the product, hidden here).
  const kondisiLabel = product.kondisi === "bekas" ? "Bekas" : "Baru";
  const specsText = [
    dimText ? `Dimensi: ${dimText}` : null,
    product.ketebalan ? `Ketebalan: ${product.ketebalan}` : null,
    product.dayaListrik ? `Daya Listrik: ${product.dayaListrik}` : null,
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
    // "Soft Trade" card: resting shadow + rounded corners; the border stays in the DOM, transparent at rest, so the pickMode "selected" ring has room.
    // NOTE: deliberately NO hover `transform`: ZoomableImage's full-screen preview is `position: fixed`, and a transform on any ancestor becomes its
    // containing block, collapsing the overlay to the card's box. A hover shadow gives the same cue without it.
    <div
      className={`flex flex-col overflow-hidden rounded-xl border-2 bg-panel shadow-sm transition hover:shadow-md ${
        pickMode && selected ? "border-accent" : "border-transparent"
      }`}
    >
      <ProductCardPhoto
        product={product}
        flashSaleActive={flashSaleActive}
        newStockBanner={newStockBanner}
        bannerActive={bannerActive}
        pickMode={pickMode}
        selected={selected}
        availableQty={availableQty}
        toggle={toggle}
        canEdit={canEdit}
        onEdit={onEdit}
        kondisiLabel={kondisiLabel}
        photoLabelText={photoLabelText}
      />
      <div className="flex flex-1 flex-col p-4">
        <div className="line-clamp-2 min-h-[2.75rem] text-[0.92rem] leading-snug font-medium uppercase">
          {productDisplayName(product.name, product.merk)}
        </div>
        <ProductCardPricing
          product={product}
          canFlashSale={canFlashSale}
          isOwner={isOwner}
          flashSaleActive={flashSaleActive}
          effectivePrice={effectivePrice}
          discount={discount}
          finalPrice={finalPrice}
        />
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.72rem] text-muted">
          {availableQty <= 0 ? (
            <span className="font-semibold text-accent-700">Tidak Tersedia</span>
          ) : (
            <span>Tersedia <span className="font-medium text-ink">{availableQty}</span> unit</span>
          )}
          <span className="text-line">·</span>
          <span>Komisi <span className="font-medium text-ink">{rupiah(liveKomisi)}</span></span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {product.isCustom && (
            <span className="rounded-full bg-accent-100 px-2.5 py-1 text-[0.66rem] font-semibold text-accent-700">
              Pesanan Custom
            </span>
          )}
          {/* Booked / Sudah DP / SOLD show together when they apply simultaneously (a product can have units in several states across invoices). Informational,
              not a reservation; names are in the title tooltip so the row doesn't grow unbounded. */}
          {!!product.bookedQty && (
            <span
              title={(product.bookedBy ?? []).join(", ")}
              className="cursor-default rounded-full bg-[#B45309]/10 px-2.5 py-1 text-[0.66rem] font-semibold text-[#B45309]"
            >
              Booked ×{product.bookedQty}
            </span>
          )}
          {!!product.dpQty && (
            <span
              title={(product.dpBy ?? []).join(", ")}
              className="cursor-default rounded-full bg-[#0369A1]/10 px-2.5 py-1 text-[0.66rem] font-semibold text-[#0369A1]"
            >
              Sudah DP ×{product.dpQty}
            </span>
          )}
          {!!product.soldQty && (
            <span className="rounded-full bg-gold/10 px-2.5 py-1 text-[0.66rem] font-semibold text-gold">
              SOLD {product.soldQty}
            </span>
          )}
        </div>

        {(dimText || product.ketebalan || product.dayaListrik) && (
          <div className="mt-2.5 border-t border-dashed border-line pt-2.5">
            <button
              type="button"
              onClick={() => setDetailOpen((o) => !o)}
              className="cursor-pointer font-mono text-[0.68rem] font-semibold text-muted hover:text-accent-700"
            >
              {detailOpen ? "Sembunyikan Detail ▴" : "Lihat Detail ▾"}
            </button>
            {detailOpen && (
              <div className="mt-2 flex flex-col gap-1 font-mono text-[0.7rem] leading-relaxed text-muted">
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
                {product.dayaListrik && (
                  <div>
                    <b className="font-medium text-ink">Daya Listrik:</b> {product.dayaListrik}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {cartItem ? (
          <div className="mt-auto flex w-full items-stretch overflow-hidden rounded-lg border border-accent">
            <button
              type="button"
              onClick={() => handleQtyChange(-1)}
              className="h-9 w-[38px] cursor-pointer bg-accent text-base font-semibold text-ink hover:bg-accent-deep hover:text-white"
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
              disabled={cartItem.qty >= availableQty}
              className="h-9 w-[38px] cursor-pointer bg-accent text-base font-semibold text-ink hover:bg-accent-deep hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Tambah jumlah"
            >
              +
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={availableQty <= 0}
            onClick={() => {
              addItem({
                productId: product._id,
                name: productDisplayName(product.name, product.merk).toUpperCase(),
                hargaJual: effectivePrice,
                hargaMinimum: product.hargaMinimum,
                hargaRekomendasi: product.hargaRekomendasi,
                komisiNominal: liveKomisi,
                kondisi: product.kondisi as "baru" | "bekas",
                komisiBekasPercent: product.komisiBekasPercent,
                stok: availableQty,
                fotoUrl: product.fotoUrl,
                kondisiLabel,
                stockStatusLabel,
                specsText,
                isFlashSale: flashSaleActive,
              });
              // addItem always starts a fresh cart line at diskonPerUnit 0 (CartProvider): carry over this card's diskon via the same updateItem path ItemRowEditor uses.
              if (discount > 0) updateItem(product._id, { diskonPerUnit: discount });
            }}
            className="mt-auto w-full cursor-pointer rounded-lg bg-accent py-2.5 text-center font-sans text-[0.8rem] font-semibold text-ink shadow-sm transition hover:bg-accent-deep hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {availableQty <= 0 ? "Tidak Tersedia" : "+ Tambah ke Invoice"}
          </button>
        )}
      </div>
    </div>
  );
}
