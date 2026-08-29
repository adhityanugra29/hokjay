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
  diskon = 0,
}: {
  isCustom?: boolean;
  kondisi?: "baru" | "bekas";
  /** The listed/raw sale price — NOT pre-reduced by diskon. Pass diskon separately below. */
  hargaJual: number;
  hargaMinimum: number;
  /**
   * Diskon /unit — per the user's request 2026-08-29, refined the same
   * day: for barang bekas, this is subtracted directly (Rupiah-for-
   * Rupiah) from the commission that would otherwise apply at the full
   * (undiscounted) price, all the way down to 0 if the diskon is large
   * enough — "komisi ... harus dikurangi bahkan hingga menjadi 0". This
   * used to be done by callers pre-subtracting diskon from hargaJual
   * before calling this function, which fed the DISCOUNTED price into
   * the bekas floor logic below and let commission get stuck at `base`
   * no matter how much further the diskon cut into it — moved in here so
   * every caller gets the correct floor-free behavior automatically. For
   * barang baru/custom, still folded into hargaJual before the flat 6%
   * (proportional, naturally reaches 0 as price does — no floor to fix
   * there in the first place).
   */
  diskon?: number;
}): number {
  if (isCustom || kondisi !== "bekas") {
    return Math.round((hargaJual - diskon) * 0.06);
  }

  const base = Math.round(hargaMinimum * 0.1);
  const komisiPenuh = hargaJual <= hargaMinimum ? base : Math.max(base, hargaJual - hargaMinimum);
  return Math.max(0, komisiPenuh - diskon);
}

/**
 * Diskon /unit cap for barang bekas, per the user's request 2026-08-29
 * ("besaran diskon ... tidak boleh lebih dari total insentif yang
 * diberikan"), refined the same day with a worked example: at
 * hargaMinimum=100rb (base=10rb) and hargaJual=150rb (komisi=50rb, the
 * selisih markup), the sales rep's actual max diskon should be 60rb, not
 * a flat 10rb — "kalau 50.000 itu baseline, tapi sales masih ada margin
 * 10.000 insentif yang bisa mereka pakai untuk jadi diskon". I.e. the cap
 * scales with how much markup is already priced in above the floor, plus
 * the same 10%-of-minimum margin every bekas item carries:
 *
 *   maxDiskon = (hargaJual - hargaMinimum) + 10%×hargaMinimum
 *
 * This is a strict generalization of the original flat "10% of Harga
 * Minimum" rule — it reduces to exactly that when hargaJual equals
 * hargaMinimum (no markup priced in, selisih term is 0), which is why
 * the very first version of this cap (10% flat) matched the user's
 * initial description but not this more complete one. Floored at 0
 * defensively, though hargaJual should never actually be below
 * hargaMinimum in practice — see ProductCard.tsx's/ItemRowEditor.tsx's
 * own below-minimum-price guard, which prevents that case from arising
 * in the first place.
 */
export function maxDiskonBekas(hargaJual: number, hargaMinimum: number): number {
  const base = Math.round(hargaMinimum * 0.1);
  return Math.max(0, hargaJual - hargaMinimum + base);
}
