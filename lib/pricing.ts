import { CUSTOM_ORDER_CATEGORIES, type CustomOrderCategoryId } from "./constants";

export interface CustomOrderInput {
  categoryId: CustomOrderCategoryId;
  panjangCm: number;
  lebarCm: number;
  tinggiCm: number;
  ketebalanMm: number;
  tingkat: number;
}

/**
 * Ported from the mockup's calculateCustomEstimate():
 *   volume = (P x L x T) / 100000
 *   thicknessMult = 1 + max(0, ketebalan - 1) x 0.5
 *   levelMult = 1 + max(0, tingkat - 1) x 0.8
 *   estimate = round(volume x categoryRate x thicknessMult x levelMult)
 */
export function customOrderEstimate(input: CustomOrderInput): number {
  const category = CUSTOM_ORDER_CATEGORIES.find((c) => c.id === input.categoryId);
  const rate = category?.rate ?? 0;

  const p = Number(input.panjangCm) || 0;
  const l = Number(input.lebarCm) || 0;
  const t = Number(input.tinggiCm) || 0;
  const ketebalan = Number(input.ketebalanMm) || 0;
  const tingkat = Number(input.tingkat) || 1;

  const volume = (p * l * t) / 100_000;
  const thicknessMult = 1 + Math.max(0, ketebalan - 1) * 0.5;
  const levelMult = 1 + Math.max(0, tingkat - 1) * 0.8;

  return Math.round(volume * rate * thicknessMult * levelMult);
}
