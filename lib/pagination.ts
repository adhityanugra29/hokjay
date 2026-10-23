export const PAGE_SIZE = 15;

/** Slices an already filtered/sorted list for `?page=`; an out-of-range or invalid page is clamped to the nearest real one. */
export function paginate<T>(rows: T[], pageParam: unknown): { items: T[]; page: number; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, Math.floor(Number(pageParam)) || 1));
  return { items: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), page, totalPages };
}
