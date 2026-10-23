/**
 * Sales commission formula (per invoice line, per unit):
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
/** Global fallback bekas rate (% of Harga Bottom/Minimum) when neither the product nor its category overrides it. */
export const DEFAULT_KOMISI_BEKAS_PERCENT = 10;

/** Effective bekas rate: product override > category override > global 10% (a product override always wins over its category). */
export function resolveKomisiBekasPercent(
  productOverride?: number | null,
  categoryOverride?: number | null
): number {
  if (productOverride !== undefined && productOverride !== null) return productOverride;
  if (categoryOverride !== undefined && categoryOverride !== null) return categoryOverride;
  return DEFAULT_KOMISI_BEKAS_PERCENT;
}

export interface KomisiInfo {
  percent: number;
  /** Which rule actually produced `percent` — powers the "% Komisi" column's small explanatory sub-label on Inventory's Semua Produk / Riwayat Stok tables. */
  source: "flat-baru" | "override-produk" | "default-kategori" | "default-global";
}

/** Same order as resolveKomisiBekasPercent, but also reports WHICH rule won (explains a surprising commission caused by a silent per-product override). */
export function getEffectiveKomisiInfo(
  kondisi: "baru" | "bekas" | undefined,
  productOverride?: number | null,
  categoryOverride?: number | null
): KomisiInfo {
  if (kondisi !== "bekas") return { percent: DEFAULT_KOMISI_BARU_PERCENT, source: "flat-baru" };
  if (productOverride !== undefined && productOverride !== null) {
    return { percent: productOverride, source: "override-produk" };
  }
  if (categoryOverride !== undefined && categoryOverride !== null) {
    return { percent: categoryOverride, source: "default-kategori" };
  }
  return { percent: DEFAULT_KOMISI_BEKAS_PERCENT, source: "default-global" };
}

/** Indonesian sub-label for KomisiInfo.source — shown under the % in the Inventory "% Komisi" column. */
export const KOMISI_SOURCE_LABEL: Record<KomisiInfo["source"], string> = {
  "flat-baru": "flat — barang baru",
  "override-produk": "override produk",
  "default-kategori": "default kategori",
  "default-global": "default global",
};

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
  /** Effective bekas rate (%, e.g. 10) from resolveKomisiBekasPercent(); ignored for baru/custom (flat 6%) and Flash Sale (flat 7%). Defaults to 10. */
  komisiBekasPercent?: number;
  /** Diskon /unit. Baru/custom: folded into hargaJual before the flat 6%. Bekas: see the bekas branch. Ignored for Flash Sale (diskon locked at 0). */
  diskon?: number;
  /** Flash Sale: flat 7% of the locked Flash Sale price; bypasses kondisi/hargaMinimum/diskon entirely (not a variant of the bekas formula). */
  isFlashSale?: boolean;
}): number {
  if (isFlashSale) {
    return Math.round(hargaJual * 0.07);
  }

  if (isCustom || kondisi !== "bekas") {
    return Math.round((hargaJual - diskon) * 0.06);
  }

  // Bekas. Worked examples at the default 10% (min/jual/diskon): 100rb/150rb/60rb -> 0; 100rb/200rb/60rb -> 40rb;
  // 5.000.000/6.000.000/700.000 -> 500rb. The 10%-of-minimum `base` is a guarantee that only holds while the sale is above Harga
  // Minimum, so it is re-applied as a floor AFTER diskon is subtracted; once diskon pushes the price to/below the minimum it erodes
  // rupiah-for-rupiah, down to 0. (Subtracting diskon from the already-floored commission let a large markup "absorb" diskon.)
  const base = Math.round(hargaMinimum * (komisiBekasPercent / 100));
  const effective = hargaJual - diskon;
  if (effective > hargaMinimum) {
    return Math.max(base, effective - hargaMinimum);
  }
  return Math.max(0, base - (hargaMinimum - effective));
}

/**
 * Diskon /unit cap for bekas: the markup already priced in above the floor plus the protected margin:
 *   maxDiskon = (hargaJual - hargaMinimum) + komisiBekasPercent% × hargaMinimum
 * e.g. min 100rb, jual 150rb -> 50rb markup + 10rb margin = 60rb. Reduces to the flat "10% of minimum" when hargaJual = hargaMinimum.
 * Floored at 0 defensively (the below-minimum price guard in ProductCard/ItemRowEditor normally prevents jual < min).
 * `komisiBekasPercent` tracks the resolved override so the cap always matches what computeLineCommission pays.
 * `unlimited` (Owner only): skips the formula and returns hargaJual (diskon up to 100%). Callers resolve it from the SESSION role
 * server-side, never from a client flag — see createInvoice.ts/updateInvoice.ts.
 */
export function maxDiskonBekas(
  hargaJual: number,
  hargaMinimum: number,
  komisiBekasPercent: number = DEFAULT_KOMISI_BEKAS_PERCENT,
  unlimited = false
): number {
  if (unlimited) return hargaJual;
  const base = Math.round(hargaMinimum * (komisiBekasPercent / 100));
  return Math.max(0, hargaJual - hargaMinimum + base);
}

/** Flat commission rate (%) for barang baru/custom; matches the 0.06 in computeLineCommission. */
export const DEFAULT_KOMISI_BARU_PERCENT = 6;

/**
 * Diskon /unit cap for baru/custom: same shape as maxDiskonBekas, with a protected margin of the flat 6% rate. computeLineCommission
 * itself is unchanged (flat 6% of hargaJual-diskon). A true custom-order line has hargaMinimum 0 (see createInvoice.ts), so this
 * degrades to hargaJual. `unlimited`: see maxDiskonBekas.
 */
export function maxDiskonBaru(hargaJual: number, hargaMinimum: number, unlimited = false): number {
  if (unlimited) return hargaJual;
  const base = Math.round(hargaMinimum * (DEFAULT_KOMISI_BARU_PERCENT / 100));
  return Math.max(0, hargaJual - hargaMinimum + base);
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

function diskonCapUnit(line: BulkDiskonLine, unlimited: boolean): number {
  return line.isCustom || line.kondisi !== "bekas"
    ? maxDiskonBaru(line.hargaJual, line.hargaMinimum, unlimited)
    : maxDiskonBekas(line.hargaJual, line.hargaMinimum, line.komisiBekasPercent ?? DEFAULT_KOMISI_BEKAS_PERCENT, unlimited);
}

/**
 * Distributes one total discount across eligible lines. Skips Flash Sale lines (diskon locked at 0) and lines with a manual diskon
 * (only fills lines at Rp0). Greedy: exhausts Baru/Custom capacity first (6x cheaper commission per rupiah than Bekas), then spills
 * into Bekas. Every diskonPerUnit is a multiple of Rp10.000: filled to the nearest step below the ideal split, leftovers redistributed
 * in further steps, cheapest line first, until met or every line is maxed out. `unlimited` (Owner only): see maxDiskonBekas.
 */
export function allocateBulkDiskon(
  lines: BulkDiskonLine[],
  totalRequested: number,
  unlimited = false
): BulkDiskonResult {
  const eligible = lines.filter((l) => !l.isFlashSale && l.diskonPerUnit === 0 && l.qty > 0);
  const sorted = [...eligible].sort((a, b) => komisiCostPerRupiah(a) - komisiCostPerRupiah(b));

  const allocations = new Map<string, number>();
  let remaining = Math.max(0, Math.round(totalRequested));

  for (const line of sorted) {
    if (remaining < BULK_DISKON_STEP) break;
    const capTotal = diskonCapUnit(line, unlimited) * line.qty;
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
      const capUnit = diskonCapUnit(line, unlimited);
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
