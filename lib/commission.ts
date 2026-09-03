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
/**
 * Global fallback rate for barang bekas commission (% of Harga
 * Bottom/Minimum) when neither the product nor its category has an
 * override set — see resolveKomisiBekasPercent() below. This is the exact
 * rate every bekas product effectively used before per-product/per-category
 * overrides existed (2026-09-03), so leaving both overrides unset must
 * reproduce the old behavior exactly.
 */
export const DEFAULT_KOMISI_BEKAS_PERCENT = 10;

/**
 * Resolves the effective barang-bekas commission rate for one product:
 * its own override wins if set, otherwise its category's default, otherwise
 * the global 10%. Per the user's request 2026-09-03 ("kalau dia ganti per
 * kategori dia akan mengganti semua kategori, tapi kalau dia mau ganti per
 * produk, perubahan kategori ini tidak berlaku untuk yang per produk") —
 * product-level always wins over category-level.
 */
export function resolveKomisiBekasPercent(
  productOverride?: number | null,
  categoryOverride?: number | null
): number {
  if (productOverride !== undefined && productOverride !== null) return productOverride;
  if (categoryOverride !== undefined && categoryOverride !== null) return categoryOverride;
  return DEFAULT_KOMISI_BEKAS_PERCENT;
}

export function computeLineCommission({
  isCustom,
  kondisi,
  hargaJual,
  hargaMinimum,
  diskon = 0,
  isFlashSale = false,
  komisiBekasPercent = DEFAULT_KOMISI_BEKAS_PERCENT,
}: {
  isCustom?: boolean;
  kondisi?: "baru" | "bekas";
  /** The listed/raw sale price — NOT pre-reduced by diskon. Pass diskon separately below. */
  hargaJual: number;
  hargaMinimum: number;
  /**
   * Effective barang-bekas commission rate (%, e.g. 10 for 10%) — pass the
   * result of resolveKomisiBekasPercent() so a product/category override
   * (Owner-only, per the user's request 2026-09-03) applies here. Ignored
   * for baru/custom (flat 6%, see below) and Flash Sale (flat 7%).
   * Defaults to the original global 10% if not passed.
   */
  komisiBekasPercent?: number;
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
  // 5.000.000rb/6.000.000rb/700.000 diskon -> 500rb) — all three assume
  // the default 10% rate; komisiBekasPercent (2026-09-03) generalizes the
  // same shape to whatever rate resolveKomisiBekasPercent() resolves to.
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
  const base = Math.round(hargaMinimum * (komisiBekasPercent / 100));
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
 *
 * `komisiBekasPercent` (2026-09-03, defaults to the original 10%) —
 * generalizes the "10%×hargaMinimum" term above to whatever rate
 * resolveKomisiBekasPercent() resolves for this product, so the diskon cap
 * always tracks the same guaranteed-commission margin computeLineCommission
 * actually pays out, even when that rate's been overridden.
 */
export function maxDiskonBekas(
  hargaJual: number,
  hargaMinimum: number,
  komisiBekasPercent: number = DEFAULT_KOMISI_BEKAS_PERCENT
): number {
  const base = Math.round(hargaMinimum * (komisiBekasPercent / 100));
  return Math.max(0, hargaJual - hargaMinimum + base);
}

/**
 * Diskon /unit cap for barang baru/custom — per TASK-003 (Bulk Diskon,
 * confirmed with the user 2026-08-30): unlike bekas, there's no floor to
 * protect, so the cap is just the sale price itself (commission can go all
 * the way to Rp0, never negative). Also closes BUG-004 — createInvoice.ts/
 * updateInvoice.ts had no server-side ceiling on this diskon at all before,
 * only bekas was clamped.
 */
export function maxDiskonBaru(hargaJual: number): number {
  return Math.max(0, hargaJual);
}

/** One invoice line's shape as far as the bulk-diskon allocator cares. */
export interface BulkDiskonLine {
  /** Cart key — a real product's _id, or a custom item's synthetic `custom-${name}` id (see CartProvider.tsx/InvoiceForm.tsx). */
  productId: string;
  isCustom?: boolean;
  kondisi?: "baru" | "bekas";
  hargaJual: number;
  hargaMinimum: number;
  komisiBekasPercent?: number;
  diskonPerUnit: number;
  isFlashSale?: boolean;
  qty: number;
}

export interface BulkDiskonResult {
  /** productId -> new diskonPerUnit (Rp, a multiple of Rp10.000) for every line the allocator actually touched. */
  allocations: Map<string, number>;
  /** Total diskon actually achieved (sum of diskonPerUnit x qty across touched lines) — may be less than requested. */
  achieved: number;
  /** True when achieved < requested — ran out of eligible capacity (or the shortfall is smaller than one Rp10.000 step). */
  capped: boolean;
}

const BULK_DISKON_STEP = 10000;

/** Cheapest-commission-cost-per-rupiah first, for allocation order — see the module doc comment at the top of this file. A heuristic for ordering only; the real payout is always computeLineCommission's exact formula, never this number. */
function komisiCostPerRupiah(line: Pick<BulkDiskonLine, "isCustom" | "kondisi">): number {
  return line.isCustom || line.kondisi !== "bekas" ? 0.06 : 1;
}

function diskonCapUnit(line: BulkDiskonLine): number {
  return line.isCustom || line.kondisi !== "bekas"
    ? maxDiskonBaru(line.hargaJual)
    : maxDiskonBekas(line.hargaJual, line.hargaMinimum, line.komisiBekasPercent ?? DEFAULT_KOMISI_BEKAS_PERCENT);
}

/**
 * Distributes one total discount amount across eligible invoice lines —
 * TASK-003, confirmed with the user 2026-08-30. Skips Flash Sale lines
 * (diskon locked at 0 by existing rules) and any line that already has a
 * manually-typed diskon — bulk diskon only ever fills lines currently at
 * Rp0, never overwrites a manual entry. Greedy: exhausts Baru/Custom
 * capacity first (6x cheaper commission-wise per rupiah than Bekas), then
 * spills into Bekas only if the total isn't covered yet. Every line's
 * resulting diskonPerUnit is a clean Rp10.000 multiple — filled to the
 * nearest step below the ideal split, then any leftover (from that
 * rounding, or simply because the total exceeds every eligible line's
 * combined capacity) is redistributed in further Rp10.000 steps,
 * cheapest-line-first, until either the request is met or every eligible
 * line is maxed out.
 */
export function allocateBulkDiskon(lines: BulkDiskonLine[], totalRequested: number): BulkDiskonResult {
  const eligible = lines.filter((l) => !l.isFlashSale && l.diskonPerUnit === 0 && l.qty > 0);
  const sorted = [...eligible].sort((a, b) => komisiCostPerRupiah(a) - komisiCostPerRupiah(b));

  const allocations = new Map<string, number>();
  let remaining = Math.max(0, Math.round(totalRequested));

  for (const line of sorted) {
    if (remaining < BULK_DISKON_STEP) break;
    const capTotal = diskonCapUnit(line) * line.qty;
    if (capTotal < BULK_DISKON_STEP) continue;

    const wantTotal = Math.min(remaining, capTotal);
    const diskonPerUnit = Math.floor(wantTotal / line.qty / BULK_DISKON_STEP) * BULK_DISKON_STEP;
    if (diskonPerUnit <= 0) continue;

    allocations.set(line.productId, diskonPerUnit);
    remaining -= diskonPerUnit * line.qty;
  }

  // Mop up whatever's left (per-line rounding-down, or simply more than
  // every line's combined capacity) in further Rp10.000 steps, cheapest
  // line first, while any line still has headroom.
  let progressed = true;
  while (remaining >= BULK_DISKON_STEP && progressed) {
    progressed = false;
    for (const line of sorted) {
      if (remaining < BULK_DISKON_STEP) break;
      const capUnit = diskonCapUnit(line);
      const current = allocations.get(line.productId) ?? 0;
      const nextUnit = current + BULK_DISKON_STEP;
      if (nextUnit > capUnit) continue;
      const stepTotal = BULK_DISKON_STEP * line.qty;
      if (stepTotal > remaining) continue; // this line's qty makes one more step cost more than what's left
      allocations.set(line.productId, nextUnit);
      remaining -= stepTotal;
      progressed = true;
    }
  }

  const achieved = Math.max(0, Math.round(totalRequested)) - remaining;
  return { allocations, achieved, capped: achieved < Math.round(totalRequested) };
}
