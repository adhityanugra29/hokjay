import { redirect } from "next/navigation";

export const DEFAULT_PAGE_SIZE = 15;

type SearchParamsLike = { [key: string]: string | string[] | undefined };

/** Reads `?page=` (1-based, defaults to 1) and returns the page plus the `skip` to feed Mongo's `.skip()`. */
export function parsePage(sp: SearchParamsLike, pageSize = DEFAULT_PAGE_SIZE) {
  const raw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const n = Math.floor(Number(raw));
  const page = Number.isFinite(n) && n >= 1 ? n : 1;
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function totalPagesOf(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Link to `page` of `basePath`, keeping every other query param (page=1 is left out so the first page keeps a clean URL). */
export function pageHref(basePath: string, sp: SearchParamsLike, page: number): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "page") continue;
    if (typeof v === "string") params.set(k, v);
    else if (Array.isArray(v)) for (const x of v) params.append(k, x);
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** A stale bookmark or a shrinking list can leave `?page=` beyond the data: send the user to the last real page instead of an empty table. */
export function clampPageOrRedirect(basePath: string, sp: SearchParamsLike, page: number, total: number, pageSize: number) {
  const totalPages = totalPagesOf(total, pageSize);
  if (page > totalPages) redirect(pageHref(basePath, sp, totalPages));
}
