"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { useCatalogSelection } from "./CatalogSelectionProvider";
import ZoomableImage from "./ZoomableImage";
import { CurrencyInput } from "@/components/ui/Form";
import { useDialog } from "@/components/ui/Dialog";
import { rupiah, slugify } from "@/lib/format";
import { computeLineCommission } from "@/lib/commission";

/**
 * Downloads a photo per the user's request 2026-08-27 ("bisa download
 * gambarnya, tapi buttonya di setiap produk saja") — a plain <a href
 * download> is silently ignored by browsers for cross-origin URLs (Vercel
 * Blob is a different origin than this app), so the file has to actually be
 * fetched as a blob first and downloaded from a same-origin blob: URL,
 * which always honors `download`.
 *
 * When `label` is given (the dimension footnote), it gets baked into the
 * downloaded file too — per the user's follow-up 2026-08-27 ("waktu di
 * zoom atau download, itu bisa di applied juga"), the label previously
 * only showed as an on-screen overlay, invisible once the raw photo was
 * saved. Composited via <canvas> at the image's own full resolution
 * (crossOrigin:"anonymous" — Vercel Blob serves permissive CORS, already
 * relied on for the Katalog PDF's own captures) rather than screenshotting
 * anything, so the output stays exactly as sharp as the source photo.
 *
 * A module-level function, not a hook — it can't call useDialog() itself,
 * so failures are left to propagate and the caller (inside the component,
 * where the hook is available) shows the error dialog. Per the user's
 * request 2026-08-28 to replace every native alert()/confirm() in the app.
 */
async function downloadPhoto(url: string, filename: string, label?: string) {
  if (!label) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Gagal mengambil foto");
    const blob = await res.blob();
    triggerDownload(blob, filename);
    return;
  }

  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Gagal memuat foto"));
    img.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak didukung");
  ctx.drawImage(img, 0, 0);

  // Badge scaled proportionally to the photo's own resolution so it
  // reads the same relative size on a small or a huge source photo.
  const fontSize = Math.max(16, Math.round(img.naturalWidth * 0.022));
  ctx.font = `${fontSize}px sans-serif`;
  const padX = fontSize * 0.6;
  const padY = fontSize * 0.45;
  const margin = fontSize * 0.5;
  const textWidth = ctx.measureText(label).width;
  const boxWidth = textWidth + padX * 2;
  const boxHeight = fontSize + padY * 2;
  const boxY = img.naturalHeight - boxHeight - margin;
  ctx.fillStyle = "rgba(32, 30, 29, 0.7)";
  ctx.fillRect(margin, boxY, boxWidth, boxHeight);
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(label, margin + padX, boxY + boxHeight / 2);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) throw new Error("Gagal membuat file");
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
}

export default function ProductCard({
  product,
  canEdit,
  onEdit,
}: {
  product: KatalogProduct;
  /** Manager/Owner/Super Admin only — shows the pencil that opens the inline edit drawer. Per the user's request 2026-08-27. */
  canEdit?: boolean;
  onEdit?: () => void;
}) {
  const { items, addItem, updateItem, removeItem } = useCart();
  const { isSelected, toggle, pickMode, getPriceMode, setPriceMode, customPrices, setCustomPrice, getEffectivePrice } =
    useCatalogSelection();
  const { alert } = useDialog();
  const cartItem = items.find((i) => i.productId === product._id);
  const selected = isSelected(product._id);
  const hasCustomPrice = customPrices[product._id] !== undefined;
  const [downloadingPhoto, setDownloadingPhoto] = useState(false);
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
        {canEdit && (
          <button
            type="button"
            title="Ubah data produk"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
            className="absolute top-2.5 right-2.5 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/30 bg-ink/70 text-white hover:bg-ink"
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
                const ext = product.fotoUrl.match(/\.(jpe?g|png|webp)(?:$|\?)/i)?.[1] ?? "jpg";
                try {
                  await downloadPhoto(
                    product.fotoUrl,
                    `${slugify(product.name) || "produk"}.${ext}`,
                    photoLabelText ?? undefined
                  );
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
          <CurrencyInput
            value={String(effectivePrice)}
            onChange={(v) => setCustomPrice(product._id, v ? Number(v) : 0)}
            showPrefix
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
          {availableQty <= 0 ? (
            <span className="text-accent-700">Tidak Tersedia</span>
          ) : (
            <>Tersedia: <span className="font-medium text-ink">{availableQty}</span> unit</>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {product.isCustom && (
            <span className="border border-accent px-2.5 py-1 text-[0.66rem] font-semibold text-accent">
              Pesanan Custom
            </span>
          )}
          {/* Booked / Sudah DP / SOLD — all shown together when they apply
              simultaneously (a product can have units in more than one
              state across different invoices at once), per the user's
              confirmed choice 2026-08-27. Still selectable/pickable —
              these are informational, not a reservation. */}
          {!!product.bookedQty && (
            <span className="border border-[#B45309] px-2.5 py-1 text-[0.66rem] font-semibold text-[#B45309]">
              Booked {product.bookedQty} — {(product.bookedBy ?? []).join(", ")}
            </span>
          )}
          {!!product.dpQty && (
            <span className="border border-[#0369A1] px-2.5 py-1 text-[0.66rem] font-semibold text-[#0369A1]">
              Sudah DP {product.dpQty} — {(product.dpBy ?? []).join(", ")}
            </span>
          )}
          {!!product.soldQty && (
            <span className="border border-gold px-2.5 py-1 text-[0.66rem] font-semibold text-gold">
              SOLD {product.soldQty}
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

        {/* Small, label-styled badge (not a bold/large number) — per the
            user's report 2026-08-26 that a big accent-colored Komisi figure
            read as competing with the actual price above it, easy to
            mistake for a second price. */}
        <div className="mt-2.5 inline-flex w-fit items-center gap-1.5 border border-line px-2 py-1 text-[0.66rem] text-muted">
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
              disabled={cartItem.qty >= availableQty}
              className="h-9 w-[38px] cursor-pointer bg-accent text-base font-semibold text-white hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Tambah jumlah"
            >
              +
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={availableQty <= 0}
            onClick={() =>
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
              })
            }
            className="mt-auto w-full cursor-pointer border border-accent bg-accent py-2.5 text-center font-sans text-[0.8rem] font-semibold text-white transition hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-40"
          >
            {availableQty <= 0 ? "Tidak Tersedia" : "+ Tambah ke Invoice"}
          </button>
        )}
      </div>
    </div>
  );
}
