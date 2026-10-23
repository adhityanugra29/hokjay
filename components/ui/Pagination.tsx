import Link from "next/link";
import { pageHref, totalPagesOf } from "@/lib/pagination";

type SearchParamsLike = { [key: string]: string | string[] | undefined };

/** The page numbers to show: first, last, and a window around the current one, with "…" where it skips. */
function pageWindow(page: number, totalPages: number): (number | "…")[] {
  const keep = new Set([1, totalPages, page - 1, page, page + 1]);
  const nums = [...keep].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

const BTN = "rounded-lg border px-3 py-1.5 font-sans text-[0.74rem] font-semibold no-underline transition";

/**
 * Footer for a paginated list (server component: plain links, so every page change is a normal navigation with the route's loading skeleton).
 * Renders nothing when everything fits on one page. `searchParams` is the page's own, so search/sort/filter params survive a page change.
 */
export default function Pagination({
  basePath,
  searchParams,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  searchParams: SearchParamsLike;
  page: number;
  pageSize: number;
  total: number;
}) {
  if (total <= pageSize) return null;
  const totalPages = totalPagesOf(total, pageSize);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const href = (p: number) => pageHref(basePath, searchParams, p);
  const idle = "border-line text-ink hover:bg-black/5";
  const off = "pointer-events-none border-line text-muted opacity-40";

  return (
    <nav
      aria-label="Halaman"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5 font-mono text-[0.72rem] text-muted"
    >
      <div>
        {from}–{to} dari {total}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Link href={href(Math.max(1, page - 1))} aria-disabled={page <= 1} className={`${BTN} ${page <= 1 ? off : idle}`}>
          ‹ Sebelumnya
        </Link>
        <span className="px-1 sm:hidden">
          {page} / {totalPages}
        </span>
        <span className="hidden items-center gap-1.5 sm:flex">
          {pageWindow(page, totalPages).map((n, i) =>
            n === "…" ? (
              <span key={`gap-${i}`} className="px-1">
                …
              </span>
            ) : (
              <Link
                key={n}
                href={href(n)}
                aria-current={n === page ? "page" : undefined}
                className={`${BTN} ${n === page ? "border-ink bg-ink text-accent" : idle}`}
              >
                {n}
              </Link>
            )
          )}
        </span>
        <Link
          href={href(Math.min(totalPages, page + 1))}
          aria-disabled={page >= totalPages}
          className={`${BTN} ${page >= totalPages ? off : idle}`}
        >
          Berikutnya ›
        </Link>
      </div>
    </nav>
  );
}
