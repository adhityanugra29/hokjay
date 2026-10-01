import { MONTH_NAMES } from "@/lib/constants";
import { currentJakartaMonthYear } from "@/lib/timezone";

/**
 * Shared month filter for the Payroll tabs that work per period (Gaji,
 * Absensi, Riwayat). One `?periode=YYYY-MM` URL param, carried across those
 * tabs by PayrollNav, so the owner picks the month once instead of once per
 * page. Komisi and Karyawan deliberately ignore it: unpaid commission is a
 * running balance (a month filter could hide commission that was never paid),
 * and the Karyawan roster has no period. Pure module (no "use client") so
 * server pages and the client nav can both import it.
 */

/** How far back the stepper's ‹ arrow goes; older months stay reachable by URL. */
export const PAYROLL_MAX_MONTHS_BACK = 6;

const PERIODE_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** The running month in GMT+7, as "YYYY-MM". */
export function currentPayrollPeriode(): string {
  const { year, month } = currentJakartaMonthYear();
  return `${year}-${String(month).padStart(2, "0")}`;
}

function toIndex(periode: string): number {
  const [y, m] = periode.split("-").map(Number);
  return y * 12 + (m - 1);
}

export function shiftPeriode(periode: string, delta: number): string {
  const i = toIndex(periode) + delta;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;
}

/** A valid "YYYY-MM" that is not in the future, or null. `current` is the running month. */
export function parsePeriode(raw: string | string[] | null | undefined, current: string): string | null {
  if (typeof raw !== "string" || !PERIODE_RE.test(raw)) return null;
  return toIndex(raw) <= toIndex(current) ? raw : null;
}

export function canGoBack(periode: string, current: string): boolean {
  return toIndex(current) - toIndex(periode) < PAYROLL_MAX_MONTHS_BACK;
}

export function canGoForward(periode: string, current: string): boolean {
  return toIndex(periode) < toIndex(current);
}

/** "Oktober 2026" */
export function periodeLabel(periode: string): string {
  const [y, m] = periode.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export function daysInPeriode(periode: string): number {
  const [y, m] = periode.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
