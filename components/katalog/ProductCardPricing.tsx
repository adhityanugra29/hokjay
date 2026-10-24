"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCatalogSelection } from "./CatalogSelectionProvider";
import { CurrencyInput } from "@/components/ui/Form";
import { useDialog } from "@/components/ui/Dialog";
import { rupiah } from "@/lib/format";
import { maxDiskonBekas, maxDiskonBaru } from "@/lib/commission";
import type { KatalogProduct } from "./ProductCard";

/**
 * The price block of a ProductCard (price field, Rekomendasi/Bottom switch, Diskon, Harga Final, Flash Sale), moved out of ProductCard.tsx unchanged together
 * with the state that only it used. effectivePrice/discount/finalPrice stay computed in ProductCard (the commission and "+ Tambah ke Invoice" use them too).
 */
export default function ProductCardPricing({
  product,
  canFlashSale,
  isOwner,
  flashSaleActive,
  effectivePrice,
  discount,
  finalPrice,
}: {
  product: KatalogProduct;
  canFlashSale?: boolean;
  isOwner?: boolean;
  flashSaleActive: boolean;
  effectivePrice: number;
  discount: number;
  finalPrice: number;
}) {
  const router = useRouter();
  const { getPriceMode, setPriceMode, customPrices, setCustomPrice, getDiscount, setDiscount } = useCatalogSelection();
  const { alert } = useDialog();
  const hasCustomPrice = customPrices[product._id] !== undefined;
  // Price warning (below-minimum or emptied-to-zero), checked on blur since intermediate typed digits are naturally too low/empty. The empty case matters:
  // the price field select-alls on focus, so an interrupted retype can leave it empty, which used to persist customPrice=0 into the card and the exported PDF.
  const [priceWarning, setPriceWarning] = useState<string | null>(null);
  // Diskon-exceeds-insentif warning (see maxDiskonBekas/maxDiskonBaru below).
  const [discountWarning, setDiscountWarning] = useState(false);
  const [diskonOpen, setDiskonOpen] = useState(() => getDiscount(product._id) > 0);
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

  return (
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
  );
}
