/**
 * Sales commission formula (per invoice line, per unit), agreed with the
 * user 2026-08-18:
 *
 * - Barang baru / custom: flat 6% of the actual sale price, even if sold
 *   above the recommended/base price (no bonus for markup on new goods).
 * - Barang bekas (used): 10% of the product's "harga bottom" (hargaMinimum)
 *   when sold at that floor price. When sold above the floor, commission is
 *   whichever is larger: that same 10%-of-bottom baseline, or the actual
 *   markup (hargaJual - hargaMinimum) — so a sales rep who negotiates a
 *   price above the floor keeps the extra margin as commission instead of
 *   being capped at 10%.
 */
export function computeLineCommission({
  isCustom,
  kondisi,
  hargaJual,
  hargaMinimum,
}: {
  isCustom?: boolean;
  kondisi?: "baru" | "bekas";
  hargaJual: number;
  hargaMinimum: number;
}): number {
  if (isCustom || kondisi !== "bekas") {
    return Math.round(hargaJual * 0.06);
  }

  const base = Math.round(hargaMinimum * 0.1);
  if (hargaJual <= hargaMinimum) return base;
  const selisih = hargaJual - hargaMinimum;
  return Math.max(base, selisih);
}
