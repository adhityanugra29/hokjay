"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { useCatalogSelection } from "./CatalogSelectionProvider";
import ZoomableImage from "./ZoomableImage";
import { CurrencyInput } from "@/components/ui/Form";
import { useDialog } from "@/components/ui/Dialog";
import { rupiah, slugify } from "@/lib/format";
import { computeLineCommission, maxDiskonBekas } from "@/lib/commission";

/**
 * Downloads a photo per the user's request 2026-08-27 ("bisa download
 * gambarnya, tapi buttonya di setiap produk saja") — a plain <a href
 * download> is silently ignored by browsers for cross-origin URLs (Vercel
 * Blob is a different origin than this app), so the file has to actually be
 * fetched as a blob first and downloaded from a same-origin blob: URL,
 * which always honors `download`.
 *
 * The dimension footnote gets baked into the downloaded file too — per the
 * user's follow-up 2026-08-27 ("waktu di zoom atau download, itu bisa di
 * applied juga"). This used to composite it client-side via <canvas>
 * (drawing the cross-origin Vercel Blob photo onto a canvas, which depends
 * on that browser's own CORS/image-cache behavior to avoid "tainting" the
 * canvas — invisible and inconsistent across devices), which the user
 * reported 2026-08-28 sometimes silently came out without the footnote on
 * some accounts with no clear pattern. Moved server-side instead (see
 * app/api/products/[id]/download-photo/route.ts, using sharp — the same
 * library already doing this exact kind of compositing for the upload-time
 * watermark) so the result no longer depends on the downloading browser at
 * all.
 *
 * A module-level function, not a hook — it can't call useDialog() itself,
 * so failures are left to propagate and the caller (inside the component,
 * where the hook is available) shows the error dialog. Per the user's
 * request 2026-08-28 to replace every native alert()/confirm() in the app.
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
  isCustom?: boolean;
  dimensi?: { panjangCm?: number | null; lebarCm?: number | null; tinggiCm?: number | null };
  ketebalan?: string;
  dayaListrik?: string;
  fotoUrl?: string;
  /** Added recently and never sold — see lib/katalog.ts's getProdukBaruIds. Powers the Filter sidebar's "Hanya Produk Baru" checkbox. */
  isBaru?: boolean;
  // Only populated when the viewer can edit products (manager/owner/super
  // admin) — feeds EditProductDrawer directly, with no separate fetch, so
  // opening the pencil is instant instead of waiting on a fresh API round
  // trip (that Product.find() already fetched the full document; this just
  // passes the rest of its fields through). Per the user's report
  // 2026-08-27 that the pencil felt slow to open.
  merk?: string;
  tipeProduk?: "elektronik" | "non-elektronik";
  tanggalBarangMasuk?: string;
  stokMinimum?: number;
  alertHariTidakTerjual?: number;
  fotoSampingUrl?: string;
  fotoBelakangUrl?: string;
  deskripsi?: string;
  // Booked / Sudah DP / SOLD — see lib/katalog.ts. Still stok > 0 and
  // pickable (a booking doesn't reserve stock); these are informational
  // flags so sales knows someone already has a claim on this unit before
  // promising it to another customer. Per the user's request 2026-08-27.
  bookedQty?: number;
  bookedBy?: string[];
  dpQty?: number;
  dpBy?: string[];
  /** Total units ever sold (paid), lifetime — replaces the old plain "Sudah Terjual" boolean. */
  soldQty?: number;
  /** Owner-set top-down price lock — see models/Product.ts. Per the user's request 2026-08-29. */
  flashSale?: { active: true; harga: number };
}

export default function ProductCard({
  product,
  canEdit,
  canFlashSale,
  onEdit,
}: {
  product: KatalogProduct;
  /** Manager/Owner/Super Admin only — shows the pencil that opens the inline edit drawer. Per the user's request 2026-08-27. */
  canEdit?: boolean;
  /** Owner/Super Admin only — shows the Flash Sale button. Per the user's request 2026-08-29. */
  canFlashSale?: boolean;
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
  // Price warning (below-minimum OR emptied-to-zero) — per the user's
  // request 2026-08-29 for the below-minimum case, extended 2026-08-31
  // after a real report of a katalog PDF shipping a Rp 0 price: the price
  // field select-all's on focus (see CurrencyInput), so clicking in to
  // retype and getting interrupted before finishing (tab away, click
  // another card) can leave the field genuinely empty on blur. The old
  // guard only handled "positive but below hargaMinimum" — an empty/zero
  // blur fell through untouched, silently persisting customPrice=0
  // (getEffectivePrice treats 0 as a real override, not "unset") into
  // both this card's own display and the exported PDF, with no warning
  // shown at all. Checked on blur, not on every keystroke, since
  // intermediate typed digits are naturally "too low"/empty while a
  // larger number is still being typed. Holds the actual message now
  // (not just a boolean) since there are two different reasons to show.
  const [priceWarning, setPriceWarning] = useState<string | null>(null);
  // Diskon-exceeds-insentif warning for barang bekas — see maxDiskonBekas
  // usage below. Per the user's request 2026-08-29.
  const [discountWarning, setDiscountWarning] = useState(false);
  // Flash Sale — top-down price lock set by an owner/super_admin (server
  // enforced, see app/api/products/[id]/flash-sale/route.ts). While
  // active, this card can't offer any other price: no preset buttons, no
  // custom price, no Diskon. Per the user's request 2026-08-29.
  const flashSaleActive = !!product.flashSale?.active;
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

  // Price toggle (Harga Rekomendasi/Minimum, + manual custom typing) shows
  // on every product card at all times — not just while picking products
  // for the PDF — and this is the price actually used for "+ Tambah ke
  // Invoice" below. Per the user's request 2026-08-25. Overridden entirely
  // by the Flash Sale price when active — that's the whole point of a
  // top-down lock, no other price can apply.
  const effectivePrice = flashSaleActive ? (product.flashSale?.harga ?? 0) : getEffectivePrice(product);
  // Diskon — separate from the price above (which is what the customer
  // pays); this is how much of that price was given away, tracked so it
  // can also reduce komisi. Per the user's request 2026-08-29. Forced to 0
  // during a Flash Sale — the locked price already is the final price.
  const discount = flashSaleActive ? 0 : getDiscount(product._id);
  const finalPrice = Math.max(0, effectivePrice - discount);
  // Live insentif — matches the exact formula used at real invoice time
  // (lib/commission.ts), computed against whatever price is currently
  // showing minus diskon, same as the authoritative save-time calculation
  // in lib/services/createInvoice.ts/updateInvoice.ts. Per the user's
  // request 2026-08-25 (live preview), 2026-08-29 (diskon factored in),
  // and 2026-08-29 again (Flash Sale gets its own flat 7%, bypassing the
  // usual kondisi/hargaMinimum-based formula entirely).
  const liveKomisi = computeLineCommission({
    isCustom: product.isCustom,
    kondisi: product.kondisi as "baru" | "bekas",
    hargaJual: effectivePrice,
    diskon: discount,
    hargaMinimum: product.hargaMinimum,
    isFlashSale: flashSaleActive,
  });

  const dims = product.dimensi;
  const dimText =
    dims && (dims.panjangCm || dims.lebarCm || dims.tinggiCm)
      ? `${dims.panjangCm ?? "—"} x ${dims.lebarCm ?? "—"} x ${dims.tinggiCm ?? "—"} cm (P x L x T)`
      : null;
  // Small on-photo footnote (not the Katalog PDF — that one was reverted,
  // was crashing PDF generation entirely: html2canvas can't parse the
  // oklab color-mix() that Tailwind's bg-ink/NN opacity-modifier classes
  // compile to, per the user's report 2026-08-27) — a standalone label
  // meant to read directly on the image, e.g. "120cm x 80cm x 60cm",
  // separate from the fuller "Dimensi: ..." line already in the text block
  // below.
  const photoLabelText =
    dims?.panjangCm && dims?.lebarCm && dims?.tinggiCm
      ? `${dims.panjangCm}cm x ${dims.lebarCm}cm x ${dims.tinggiCm}cm`
      : null;

  // Stok already committed to a Booked/Sudah DP invoice doesn't physically
  // leave the shelf (that only happens at actual payment, see
  // lib/services/payInvoice.ts) — but showing the full raw stok here would
  // let a sales rep promise units that are already spoken for. This is a
  // display/qty-cap-only guard, not a real reservation: it never touches
  // Product.stok or accounting. The card itself only ever disappears once
  // stok is truly 0 (i.e. actually sold/paid) — a fully Booked/DP'd
  // product with plenty of raw stok left just shows 0 available here,
  // still visible with its badges. Per the user's request 2026-08-27.
  const availableQty = Math.max(0, product.stok - (product.bookedQty ?? 0) - (product.dpQty ?? 0));
  const stockStatusLabel = availableQty <= 0 ? "Tidak Tersedia" : `Tersedia ${availableQty} unit`;
  // Just "Bekas" / "Baru" — the kondisiPercent number was dropped from
  // every status label per the user's request 2026-08-25 (kondisiPercent
  // itself stays on the product / still editable in the form, it's only
  // hidden from this display).
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
    // "Soft Trade" card treatment (2026-08-30) — replaces the always-on
    // hard border with a resting shadow + rounded corners, matching the
    // mockup confirmed with the user (see the "Katalog Card Directions"
    // artifact). The pickMode "selected" state still needs a visible
    // ring, so the border stays in the DOM, just transparent at rest
    // instead of border-line.
    //
    // NOTE: deliberately NOT using a hover `transform` (translate) here —
    // ZoomableImage's full-screen preview is `position: fixed`, and a
    // `transform` on ANY ancestor makes it that element's own containing
    // block instead of the viewport, so the fixed overlay collapses to
    // the card's own box instead of covering the screen. Hit exactly this
    // bug 2026-08-30 ("fitur zoom eror di katalog") — a hover shadow
    // alone (box-shadow doesn't create a containing block) gives the same
    // "this card is interactive" cue without it.
    <div
      className={`flex flex-col overflow-hidden rounded-xl border-2 bg-panel shadow-sm transition hover:shadow-md ${
        pickMode && selected ? "border-accent" : "border-transparent"
      }`}
    >
      <div className="relative flex aspect-4/3 items-center justify-center overflow-hidden rounded-t-[10px] bg-surface text-[0.68rem] text-muted">
        {/* Flash Sale banner — per the user's request 2026-08-29 ("harus
            ada ... banner khusus"). Pinned to the photo's very top edge, so
            the pickMode checkbox / edit pencil below get nudged down a
            notch to stay clear of it. */}
        {flashSaleActive && (
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-center gap-1.5 bg-accent py-1.5 font-mono text-[0.7rem] font-extrabold tracking-[0.08em] text-ink">
            🔥 FLASH SALE
          </div>
        )}
        {/* Only an available product can go into the Katalog PDF — per the
            user's request 2026-08-31 ("hanya boleh checklist produk yang
            tersedia"). This is the UI-level guard (dims + blocks the
            checkbox); the actual guarantee against a stale selection
            slipping through (e.g. picked while in stock, sold out before
            the PDF was generated) lives in CatalogPrintDoc.tsx, which
            filters selectedProducts the same way regardless of what's in
            the selection state. */}
        {pickMode && (
          <label
            className={`absolute ${flashSaleActive ? "top-8" : "top-2.5"} left-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-md border-2 border-line bg-panel shadow-sm ${
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
            className={`absolute ${flashSaleActive ? "top-8" : "top-2.5"} right-2.5 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/30 bg-ink/70 text-white hover:bg-ink`}
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13.5 3.5 16.5 6.5M4 16l.7-3.2L12.8 4.7a1.5 1.5 0 0 1 2.1 0l.4.4a1.5 1.5 0 0 1 0 2.1L7.2 15.3 4 16Z" />
            </svg>
          </button>
        )}
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
                // Matches the server's own extension choice (see
                // app/api/products/[id]/download-photo/route.ts): a
                // labeled photo is always re-encoded to .jpg, an
                // unlabeled one passes through in its original format.
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
        {/* Fixed-height name block + Insentif called out bold/red, matching
            the Hot Products carousel cards (see confirmation 2026-08-20). */}
        <div className="line-clamp-2 min-h-[2.75rem] text-[0.92rem] leading-snug font-medium">{product.name}</div>
        <div className="mt-1.5 flex flex-col gap-1.5">
          {flashSaleActive ? (
            // Top-down locked price — no editable price/preset/Diskon
            // controls at all while Flash Sale is active, per the user's
            // request 2026-08-29 ("harganya tidak bisa untuk di naikan
            // atau di turunkan"). Only an owner/super_admin can end it.
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
                    // Emptied out (interrupted retype, see state comment
                    // above) — discard the override entirely rather than
                    // leaving Rp 0 in place, falling back to whichever
                    // preset (Rekomendasi/Minimum) was active before.
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
              {/* Two separate preset buttons (per the user's request
                  2026-08-25, replacing the earlier single flip-label
                  toggle) — each picks its price directly and discards any
                  manually-typed custom price above. Shows on every card
                  at all times (not gated to PDF pick mode) since this is
                  also the price used when adding to invoice. */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPriceMode(product._id, "rekomendasi");
                    setPriceWarning(null);
                  }}
                  className={`cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[0.64rem] font-semibold ${
                    getPriceMode(product._id) === "rekomendasi" && !hasCustomPrice
                      ? "border-accent bg-accent text-ink"
                      : "border-line text-ink hover:bg-[#f3f2ec]"
                  }`}
                >
                  Harga Rekomendasi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPriceMode(product._id, "minimum");
                    setPriceWarning(null);
                  }}
                  className={`cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[0.64rem] font-semibold ${
                    getPriceMode(product._id) === "minimum" && !hasCustomPrice
                      ? "border-accent bg-accent text-ink"
                      : "border-line text-ink hover:bg-[#f3f2ec]"
                  }`}
                >
                  Harga Minimum
                </button>
              </div>
              {/* Diskon — separate field from the price above, per the
                  user's request 2026-08-29 ("field diskon terpisah dari
                  harga"). Harga Final (below) and the live Komisi figure
                  both already factor this in — see finalPrice/liveKomisi
                  above. Capped at 10% of Harga Minimum for barang bekas
                  (maxDiskonBekas, same base used inside
                  computeLineCommission) on blur, not every keystroke —
                  same "don't fight mid-typing" reasoning as the
                  below-minimum price guard above. Per the user's request
                  2026-08-29 ("besaran diskon ... tidak boleh lebih dari
                  total insentif yang diberikan"). Barang baru/custom have
                  no such cap — confirmed scope. */}
              {/* Stacked (label above, full-width input) instead of side-
                  by-side — per the user's report 2026-08-30 ("tabel
                  diskon kecil dan menyamping"): squeezing the label onto
                  the same row as the input left the input itself
                  cramped. */}
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[0.64rem] uppercase tracking-[0.06em] text-muted">
                  Diskon
                </span>
                <CurrencyInput
                  value={String(discount)}
                  onChange={(v) => {
                    setDiscount(product._id, v ? Number(v) : 0);
                    setDiscountWarning(false);
                  }}
                  onBlur={(v) => {
                    if (product.kondisi !== "bekas") return;
                    const num = v ? Number(v) : 0;
                    const max = maxDiskonBekas(effectivePrice, product.hargaMinimum);
                    if (num > max) {
                      setDiscount(product._id, max);
                      setDiscountWarning(true);
                    }
                  }}
                  showPrefix
                />
              </div>
              {discountWarning && (
                <div className="text-[0.68rem] font-medium text-accent-700">
                  Diskon melebihi batas insentif, disesuaikan otomatis ke maksimal{" "}
                  {rupiah(maxDiskonBekas(effectivePrice, product.hargaMinimum))}.
                </div>
              )}
              {discount > 0 && (
                <div className="flex items-center justify-between font-mono text-[0.72rem]">
                  <span className="text-muted">Harga Final</span>
                  <span className="font-semibold text-ink">{rupiah(finalPrice)}</span>
                </div>
              )}
              {/* Flash Sale activation — owner/super_admin only, see
                  app/api/products/[id]/flash-sale/route.ts. Per the
                  user's request 2026-08-29. */}
              {canFlashSale &&
                (flashSaleFormOpen ? (
                  // Stacked, not side-by-side with the two buttons — per
                  // the user's report 2026-08-29 that the number field was
                  // too cramped to read next to them (this card column is
                  // narrow to begin with).
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
        <div className="mt-2.5 text-[0.72rem] text-muted">
          {availableQty <= 0 ? (
            <span className="text-accent-700">Tidak Tersedia</span>
          ) : (
            <>Tersedia: <span className="font-medium text-ink">{availableQty}</span> unit</>
          )}
        </div>

        {/* Badges — soft rounded-full pills with a tinted background
            instead of hard-bordered rectangles, per the "Soft Trade" card
            treatment. Same semantic colors as before, just border+text →
            tint+text. */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {product.isCustom && (
            <span className="rounded-full bg-accent-100 px-2.5 py-1 text-[0.66rem] font-semibold text-accent-700">
              Pesanan Custom
            </span>
          )}
          {/* Booked / Sudah DP / SOLD — all shown together when they apply
              simultaneously (a product can have units in more than one
              state across different invoices at once), per the user's
              confirmed choice 2026-08-27. Still selectable/pickable —
              these are informational, not a reservation. */}
          {!!product.bookedQty && (
            <span className="rounded-full bg-[#B45309]/10 px-2.5 py-1 text-[0.66rem] font-semibold text-[#B45309]">
              Booked {product.bookedQty} — {(product.bookedBy ?? []).join(", ")}
            </span>
          )}
          {!!product.dpQty && (
            <span className="rounded-full bg-[#0369A1]/10 px-2.5 py-1 text-[0.66rem] font-semibold text-[#0369A1]">
              Sudah DP {product.dpQty} — {(product.dpBy ?? []).join(", ")}
            </span>
          )}
          {!!product.soldQty && (
            <span className="rounded-full bg-gold/10 px-2.5 py-1 text-[0.66rem] font-semibold text-gold">
              SOLD {product.soldQty}
            </span>
          )}
          {/* Just "Bekas"/"Baru" — the kondisiPercent number is dropped
              from the label (still stored/editable on the product itself,
              just not shown here). Filled with a bright color instead of
              the usual neutral outline badge so the status reads at a
              glance. Per the user's request 2026-08-25. */}
          <span
            className="rounded-full px-2.5 py-1 text-[0.66rem] font-semibold text-white"
            style={{ background: product.kondisi === "bekas" ? "#D97706" : "#16A34A" }}
          >
            {kondisiLabel}
          </span>
        </div>

        {/* Small, label-styled badge (not a bold/large number) — per the
            user's report 2026-08-26 that a big accent-colored Komisi figure
            read as competing with the actual price above it, easy to
            mistake for a second price. */}
        <div className="mt-2.5 inline-flex w-fit items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[0.66rem] text-muted">
          <span className="uppercase tracking-[0.06em]">Komisi</span>
          <span className="font-semibold text-ink">{rupiah(liveKomisi)}</span>
        </div>

        {(dimText || product.ketebalan || product.dayaListrik) && (
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
            {product.dayaListrik && (
              <div>
                <b className="font-medium text-ink">Daya Listrik:</b> {product.dayaListrik}
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
                name: product.name,
                hargaJual: effectivePrice,
                hargaMinimum: product.hargaMinimum,
                hargaRekomendasi: product.hargaRekomendasi,
                komisiNominal: liveKomisi,
                kondisi: product.kondisi as "baru" | "bekas",
                stok: availableQty,
                fotoUrl: product.fotoUrl,
                kondisiLabel,
                stockStatusLabel,
                specsText,
                isFlashSale: flashSaleActive,
              });
              // addItem always starts a fresh cart line at diskonPerUnit: 0
              // (see CartProvider.tsx) — carry over whatever diskon was set
              // on this card, per the user's request 2026-08-29, via the
              // same updateItem path ItemRowEditor's own Diskon field uses.
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
