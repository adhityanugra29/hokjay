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
  isFlashSale = false,
}: {
  isCustom?: boolean;
  kondisi?: "baru" | "bekas";
  /** The listed/raw sale price — NOT pre-reduced by diskon. Pass diskon separately below. */
  hargaJual: number;
  hargaMinimum: number;
  /**
   * Diskon /unit — per the user's request 2026-08-29, worked through
   * three examples the same day to land on the formula below (see the
   * bekas branch). For barang baru/custom, still folded into hargaJual
   * before the flat 6% (proportional, naturally reaches 0 as price does —
   * no floor to worry about there). Not consulted at all when isFlashSale
   * is true — Diskon is locked at 0 during a Flash Sale anyway.
   */
  diskon?: number;
  /**
   * Flat 7% of the (locked, top-down) Flash Sale price — per the user's
   * request 2026-08-29, reverting an earlier same-day attempt at feeding
   * the Flash Sale price into the normal barang-bekas floor logic as a
   * "new Harga Minimum". Back to the original idea: Flash Sale pricing is
   * its own thing, not a variant of the bekas formula — so it fully
   * bypasses kondisi/hargaMinimum/diskon here, the same way isCustom's
   * flat 6% doesn't consult hargaMinimum either.
   */
  isFlashSale?: boolean;
}): number {
  if (isFlashSale) {
    return Math.round(hargaJual * 0.07);
  }

  if (isCustom || kondisi !== "bekas") {
    return Math.round((hargaJual - diskon) * 0.06);
  }

  // Barang bekas, verified against three worked examples 2026-08-29
  // (100rb/150rb/60rb diskon -> 0; 100rb/200rb/60rb diskon -> 40rb;
  // 5.000.000rb/6.000.000rb/700.000 diskon -> 500rb):
  //
  // The 10%-of-Harga-Minimum `base` is a guarantee that only makes sense
  // while the sale is still actually happening above Harga Minimum — so
  // it's re-applied as a floor to whatever the (already-discounted)
  // selisih comes out to, AFTER diskon has been subtracted, not before.
  // Once diskon pushes the sale price at or below Harga Minimum, that
  // same guarantee erodes dollar-for-dollar by how far below the floor
  // it's fallen, down to (and no lower than) 0. This replaces an earlier
  // same-day version that subtracted diskon from the *already-floored*
  // full-price commission — which let a large selisih "absorb" diskon
  // that should have been protected by the base guarantee instead (see
  // the 6jt/5jt/700rb example: that version gave 300rb, not the correct
  // 500rb).
  const base = Math.round(hargaMinimum * 0.1);
  const effective = hargaJual - diskon;
  if (effective > hargaMinimum) {
    return Math.max(base, effective - hargaMinimum);
  }
  return Math.max(0, base - (hargaMinimum - effective));
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
