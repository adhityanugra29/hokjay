// This app has no timezone-aware date library; these helpers fix "now" and
// month boundaries to GMT+7 (Asia/Jakarta) regardless of what timezone the
// server process itself happens to run in.
const GMT7_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Wall-clock "now" in GMT+7, as a Date whose UTC getters read like Jakarta time. */
function nowInJakarta(): Date {
  return new Date(Date.now() + GMT7_OFFSET_MS);
}

export function currentJakartaMonthYear(): { month: number; year: number } {
  const d = nowInJakarta();
  return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
}

/** [start of month, start of next month) as real UTC instants, for a month/year in GMT+7. */
export function jakartaMonthRange(year: number, month: number): { from: Date; to: Date } {
  const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0) - GMT7_OFFSET_MS);
  const to = new Date(Date.UTC(year, month, 1, 0, 0, 0) - GMT7_OFFSET_MS);
  return { from, to };
}

/** End-of-month instant (inclusive upper bound) for a month/year in GMT+7 — for "as of" reports. */
export function jakartaMonthEnd(year: number, month: number): Date {
  return jakartaMonthRange(year, month).to;
}
