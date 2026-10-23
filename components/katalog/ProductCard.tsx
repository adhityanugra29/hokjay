"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { useCatalogSelection } from "./CatalogSelectionProvider";
import ZoomableImage from "./ZoomableImage";
import { CurrencyInput } from "@/components/ui/Form";
import { useDialog } from "@/components/ui/Dialog";
import { rupiah, slugify, productDisplayName } from "@/lib/format";
import { computeLineCommission, maxDiskonBekas, maxDiskonBaru } from "@/lib/commission";

/**
 * Downloads a photo by fetching it as a blob first: a plain <a href download> is ignored by browsers for cross-origin URLs (Vercel Blob is a different
 * origin). The dimension footnote is baked in server-side (app/api/products/[id]/download-photo/route.ts, sharp): compositing it client-side via <canvas>
 * depended on the browser's CORS/image-cache behavior and sometimes came out without it. A module-level function, not a hook (it can't call useDialog),
 * so failures propagate and the caller shows the error dialog.
 */
async function downloadPhoto(productId: string, filename: string) {
  const res = await fetch(`/api/products/${productId}/download-photo`);
  if (!res.ok) throw new Error("Gagal mengambil foto");
  const blob = await res.blob();
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

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
  const router = useRouter();
  const { items, addItem, updateItem, removeItem } = useCart();
  const {
    isSelected,
    toggle,
    pickMode,
    getPriceMode,
    setPriceMode,
    customPrices,
    setCustomPrice,
    getEffectivePrice,
    getDiscount,
    setDiscount,
  } = useCatalogSelection();
  const { alert } = useDialog();
  const cartItem = items.find((i) => i.productId === product._id);
  const selected = isSelected(product._id);
  const hasCustomPrice = customPrices[product._id] !== undefined;
  const [downloadingPhoto, setDownloadingPhoto] = useState(false);
  // Price warning (below-minimum or emptied-to-zero), checked on blur since intermediate typed digits are naturally too low/empty. The empty case matters:
  // the price field select-alls on focus, so an interrupted retype can leave it empty, which used to persist customPrice=0 into the card and the exported PDF.
  const [priceWarning, setPriceWarning] = useState<string | null>(null);
  // Diskon-exceeds-insentif warning (see maxDiskonBekas/maxDiskonBaru below).
  const [discountWarning, setDiscountWarning] = useState(false);
  // Diskon and Detail Spesifikasi are collapsed by default to declutter the card; Diskon auto-opens when the line already has a saved discount.
  const [diskonOpen, setDiskonOpen] = useState(() => getDiscount(product._id) > 0);
  const [detailOpen, setDetailOpen] = useState(false);
  // Flash Sale: top-down price lock set by owner/super_admin (server enforced, app/api/products/[id]/flash-sale/route.ts). While active this card offers no
  // other price: no presets, no custom price, no Diskon.
  const flashSaleActive = !!product.flashSale?.active;
  // The New Stock banner shares the photo's top edge with the Flash Sale banner (Flash Sale wins); either nudges the checkbox/pencil/kondisi pill down.
  const newStockBanner = !!product.isNewStock && !flashSaleActive;
  const bannerActive = flashSaleActive || newStockBanner;
  const [flashSaleFormOpen, setFlashSaleFormOpen] = useState(false);
  const [flashSaleInput, setFlashSaleInput] = useState("");
  const [flashSaleSaving, setFlashSaleSaving] = useState(false);

  async function submitFlashSale(active: boolean, harga?: number) {
    setFlashSaleSaving(true);
    try {
      const res = await fetch(`/api/products/${product._id}/flash-sale`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active, harga }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal memperbarui Flash Sale");
      }
      setFlashSaleFormOpen(false);
      setFlashSaleInput("");
      router.refresh(); // product list is server-fetched — refresh so the lock/banner show immediately, same as EditProductDrawer's own save.
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Gagal memperbarui Flash Sale");
    }
    setFlashSaleSaving(false);
  }

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
      <div className="relative flex aspect-4/3 items-center justify-center overflow-hidden rounded-t-[10px] bg-surface text-[0.68rem] text-muted">
        {/* Flash Sale banner pinned to the photo's top edge; the pickMode checkbox / edit pencil are nudged down to clear it. */}
        {flashSaleActive && (
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-center gap-1.5 bg-accent py-1.5 font-mono text-[0.7rem] font-extrabold tracking-[0.08em] text-ink">
            🔥 FLASH SALE
          </div>
        )}
        {newStockBanner && (
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-center gap-1.5 bg-[#16A34A] py-1.5 font-mono text-[0.7rem] font-extrabold tracking-[0.08em] text-white">
            ✦ NEW STOCK
          </div>
        )}
        {/* Only an available product can go into the Katalog PDF. This is the UI guard; the real guarantee against a stale selection is the availability filter in CatalogPrintDoc.tsx. */}
        {pickMode && (
          <label
            className={`absolute ${bannerActive ? "top-8" : "top-2.5"} left-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-md border-2 border-line bg-panel shadow-sm ${
              availableQty <= 0 ? "cursor-not-allowed opacity-40" : "cursor-pointer"
            }`}
            style={selected ? { background: "var(--color-accent)", borderColor: "var(--color-accent)" } : undefined}
            title={availableQty <= 0 ? "Tidak tersedia — tidak bisa dipilih untuk katalog PDF" : "Pilih untuk katalog PDF"}
          >
            <input
              type="checkbox"
              checked={selected}
              disabled={availableQty <= 0}
              onChange={() => toggle(product._id)}
              className="sr-only"
            />
            {selected && <span className="text-[13px] leading-none font-bold text-white">✓</span>}
          </label>
        )}
        {canEdit && (
          <button
            type="button"
            title="Ubah data produk"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
            className={`absolute ${bannerActive ? "top-8" : "top-2.5"} right-2.5 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/30 bg-ink/70 text-white hover:bg-ink`}
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13.5 3.5 16.5 6.5M4 16l.7-3.2L12.8 4.7a1.5 1.5 0 0 1 2.1 0l.4.4a1.5 1.5 0 0 1 0 2.1L7.2 15.3 4 16Z" />
            </svg>
          </button>
        )}
        {/* Kondisi pill sits top-left (bottom-left collided with ZoomableImage's dimension footnote), same top-8/top-2.5 banner offset as the checkbox/pencil,
            nudged right (left-11) while the pick-mode checkbox occupies that corner. */}
        <span
          className={`absolute z-10 rounded-full px-2.5 py-1 text-[0.66rem] font-semibold text-white ${
            bannerActive ? "top-8" : "top-2.5"
          } ${pickMode ? "left-11" : "left-2.5"}`}
          style={{ background: product.kondisi === "bekas" ? "#D97706" : "#16A34A" }}
        >
          {kondisiLabel}
        </span>
        {product.fotoUrl ? (
          <>
            <ZoomableImage
              src={product.fotoUrl}
              alt={product.name}
              className="h-full w-full object-cover"
              label={photoLabelText ?? undefined}
            />
            <button
              type="button"
              title="Unduh foto"
              disabled={downloadingPhoto}
              onClick={async (e) => {
                e.stopPropagation();
                if (!product.fotoUrl) return;
                setDownloadingPhoto(true);
                // Matches the server's extension choice (download-photo route): a labeled photo is always re-encoded to .jpg, an unlabeled one keeps its format.
                const ext = photoLabelText
                  ? "jpg"
                  : (product.fotoUrl.match(/\.(jpe?g|png|webp)(?:$|\?)/i)?.[1] ?? "jpg");
                try {
                  await downloadPhoto(product._id, `${slugify(product.name) || "produk"}.${ext}`);
                } catch {
                  await alert("Gagal mengunduh foto, coba lagi.");
                }
                setDownloadingPhoto(false);
              }}
              className="absolute right-2.5 bottom-2.5 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/30 bg-ink/70 text-white hover:bg-ink disabled:cursor-wait disabled:opacity-60"
            >
              {downloadingPhoto ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 3v10M6 9l4 4 4-4M4 16h12" />
                </svg>
              )}
            </button>
          </>
        ) : (
          "Tidak ada foto"
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="line-clamp-2 min-h-[2.75rem] text-[0.92rem] leading-snug font-medium uppercase">
          {productDisplayName(product.name, product.merk)}
        </div>
        <div className="mt-1.5 flex flex-col gap-1.5">
          {flashSaleActive ? (
            // Top-down locked price: no editable price/preset/Diskon controls while Flash Sale is active; only an owner/super_admin can end it.
            <div className="rounded-lg bg-accent-100 px-3 py-2.5">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-accent-700">
                Harga Flash Sale (terkunci)
              </div>
              <div className="mt-1 font-sans text-[1.1rem] font-extrabold text-accent-700">{rupiah(effectivePrice)}</div>
              {canFlashSale && (
                <button
                  type="button"
                  disabled={flashSaleSaving}
                  onClick={() => submitFlashSale(false)}
                  className="mt-2 cursor-pointer rounded-full border border-line px-2.5 py-1 font-mono text-[0.64rem] font-semibold text-ink hover:border-accent hover:text-accent-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {flashSaleSaving ? "Memproses..." : "Akhiri Flash Sale"}
                </button>
              )}
            </div>
          ) : (
            <>
              <CurrencyInput
                value={String(effectivePrice)}
                onChange={(v) => {
                  setCustomPrice(product._id, v ? Number(v) : 0);
                  setPriceWarning(null);
                }}
                onBlur={(v) => {
                  const num = v ? Number(v) : 0;
                  if (num <= 0) {
                    // Emptied out (interrupted retype): discard the override and fall back to the active preset instead of leaving Rp 0.
                    setCustomPrice(product._id, undefined);
                    const fallback = getPriceMode(product._id) === "minimum" ? product.hargaMinimum : product.hargaRekomendasi;
                    setPriceWarning(`Harga tidak boleh kosong, dikembalikan ke ${rupiah(fallback)}.`);
                  } else if (num < product.hargaMinimum) {
                    setCustomPrice(product._id, product.hargaMinimum);
                    setPriceWarning(`Harga di bawah minimum, disesuaikan otomatis ke ${rupiah(product.hargaMinimum)}.`);
                  }
                }}
                showPrefix
              />
              {priceWarning && (
                <div className="text-[0.68rem] font-medium text-accent-700">{priceWarning}</div>
              )}
              {/* Sliding switch between the Rekomendasi/Bottom presets; each picks its price directly and discards any manually typed custom price. */}
              <div className="relative flex h-[30px] w-[176px] items-center rounded-full bg-surface p-[3px]">
                <div
                  className={`absolute top-[3px] left-[3px] h-6 w-[85px] rounded-full bg-accent shadow-sm transition-transform duration-200 ease-out ${
                    getPriceMode(product._id) === "minimum" ? "translate-x-[85px]" : "translate-x-0"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    setPriceMode(product._id, "rekomendasi");
                    setPriceWarning(null);
                  }}
                  className={`relative z-10 flex-1 cursor-pointer rounded-full py-1 text-center font-mono text-[0.62rem] font-bold ${
                    getPriceMode(product._id) === "rekomendasi" && !hasCustomPrice ? "text-ink" : "text-muted"
                  }`}
                >
                  Rekomendasi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPriceMode(product._id, "minimum");
                    setPriceWarning(null);
                  }}
                  className={`relative z-10 flex-1 cursor-pointer rounded-full py-1 text-center font-mono text-[0.62rem] font-bold ${
                    getPriceMode(product._id) === "minimum" && !hasCustomPrice ? "text-ink" : "text-muted"
                  }`}
                >
                  Bottom
                </button>
              </div>
              {/* Diskon: separate from the price; Harga Final and the live Komisi factor it in. Clamped on blur (not every keystroke, same "don't fight
                  mid-typing" reasoning as the below-minimum guard) to maxDiskonBekas/maxDiskonBaru. Stacked label-above-input so the field isn't cramped;
                  collapsed behind "+ Diskon" unless a discount is already set. */}
              {diskonOpen ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[0.64rem] uppercase tracking-[0.06em] text-muted">
                      Diskon
                    </span>
                    {discount === 0 && (
                      <button
                        type="button"
                        onClick={() => setDiskonOpen(false)}
                        className="cursor-pointer font-mono text-[0.62rem] text-muted underline hover:text-accent-700"
                      >
                        Tutup
                      </button>
                    )}
                  </div>
                  <CurrencyInput
                    value={String(discount)}
                    onChange={(v) => {
                      setDiscount(product._id, v ? Number(v) : 0);
                      setDiscountWarning(false);
                    }}
                    onBlur={(v) => {
                      const num = v ? Number(v) : 0;
                      // Both kondisi have a real cap (maxDiskonBaru / maxDiskonBekas); clamp + warn on blur so manual entry gets feedback, not only a silent clamp at save.
                      const max =
                        product.kondisi === "bekas"
                          ? maxDiskonBekas(effectivePrice, product.hargaMinimum, product.komisiBekasPercent, isOwner)
                          : maxDiskonBaru(effectivePrice, product.hargaMinimum, isOwner);
                      if (num > max) {
                        setDiscount(product._id, max);
                        setDiscountWarning(true);
                      }
                    }}
                    showPrefix
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDiskonOpen(true)}
                  className="w-fit cursor-pointer font-sans text-[0.72rem] font-semibold text-muted underline underline-offset-2 hover:text-accent-700"
                >
                  + Diskon
                </button>
              )}
              {discountWarning && (
                <div className="text-[0.68rem] font-medium text-accent-700">
                  Diskon melebihi batas insentif, disesuaikan otomatis ke maksimal{" "}
                  {rupiah(
                    product.kondisi === "bekas"
                      ? maxDiskonBekas(effectivePrice, product.hargaMinimum, product.komisiBekasPercent, isOwner)
                      : maxDiskonBaru(effectivePrice, product.hargaMinimum, isOwner)
                  )}
                  .
                </div>
              )}
              {discount > 0 && (
                <div className="flex items-center justify-between font-mono text-[0.72rem]">
                  <span className="text-muted">Harga Final</span>
                  <span className="font-semibold text-ink">{rupiah(finalPrice)}</span>
                </div>
              )}
              {/* Flash Sale activation: owner/super_admin only. */}
              {canFlashSale &&
                (flashSaleFormOpen ? (
                  // Stacked: the number field was too cramped next to the buttons in this narrow column.
                  <div className="flex flex-col gap-1.5 rounded-lg bg-surface p-2">
                    <CurrencyInput value={flashSaleInput} onChange={setFlashSaleInput} showPrefix />
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={flashSaleSaving || !flashSaleInput}
                        onClick={() => submitFlashSale(true, Number(flashSaleInput))}
                        className="flex-1 cursor-pointer rounded-full border border-accent bg-accent px-2.5 py-1.5 font-mono text-[0.64rem] font-semibold text-ink hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {flashSaleSaving ? "..." : "Aktifkan"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFlashSaleFormOpen(false);
                          setFlashSaleInput("");
                        }}
                        className="flex-1 cursor-pointer rounded-full border border-line px-2.5 py-1.5 font-mono text-[0.64rem] font-semibold text-ink hover:bg-[#f3f2ec]"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setFlashSaleFormOpen(true)}
                    className="cursor-pointer rounded-full border border-accent px-2.5 py-1.5 font-mono text-[0.64rem] font-semibold text-accent-700 hover:bg-accent hover:text-ink"
                  >
                    🔥 Flash Sale
                  </button>
                ))}
            </>
          )}
        </div>
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
