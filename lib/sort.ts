export type SortDir = "asc" | "desc";

/**
 * Reads `${prefix}sort` / `${prefix}dir` against a whitelist of allowed
 * field names. The prefix lets multiple independent sortable tables share
 * one page's query string without stepping on each other (e.g. "rank" for
 * one table, "" for another).
 */
export function parseSort<T extends string>(
  sp: { [key: string]: string | string[] | undefined },
  allowed: readonly T[],
  fallback: T,
  prefix = ""
): { field: T; dir: SortDir } {
  const sortRaw = sp[`${prefix}sort`];
  const dirRaw = sp[`${prefix}dir`];
  const sortVal = Array.isArray(sortRaw) ? sortRaw[0] : sortRaw;
  const dirVal = Array.isArray(dirRaw) ? dirRaw[0] : dirRaw;
  const field = (allowed as readonly string[]).includes(sortVal ?? "") ? (sortVal as T) : fallback;
  const dir: SortDir = dirVal === "desc" ? "desc" : "asc";
  return { field, dir };
}

/** Generic in-memory sort for computed/aggregated rows (numbers, strings, or Dates). */
export function sortRows<T>(rows: T[], field: keyof T, dir: SortDir): T[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[field] as unknown;
    const bv = b[field] as unknown;
    if (av instanceof Date && bv instanceof Date) return sign * (av.getTime() - bv.getTime());
    if (typeof av === "number" && typeof bv === "number") return sign * (av - bv);
    return sign * String(av ?? "").localeCompare(String(bv ?? ""));
  });
}

/** Mongoose `.sort()` object for a field, e.g. { name: 1 }. */
export function mongoSort(field: string, dir: SortDir): Record<string, 1 | -1> {
  return { [field]: dir === "asc" ? 1 : -1 };
}
