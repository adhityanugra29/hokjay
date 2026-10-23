import Link from "next/link";

const LINK_CLS = "rounded-lg border border-line px-3 py-1.5 font-sans text-[0.78rem] font-bold text-ink no-underline hover:bg-black/5";
const OFF_CLS = "rounded-lg border border-line px-3 py-1.5 font-sans text-[0.78rem] font-bold text-muted opacity-50";

/** Prev/next links for a server-paginated list (`?page=`); keeps every other query param (search, sort, filters). Renders nothing for a single page. */
export default function Pagination({
  basePath,
  searchParams,
  page,
  totalPages,
}: {
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  function hrefFor(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (k !== "page" && typeof v === "string") params.set(k, v);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <nav aria-label="Halaman" className="flex items-center justify-between gap-3 px-5 py-4">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={LINK_CLS}>
          ← Sebelumnya
        </Link>
      ) : (
        <span className={OFF_CLS}>← Sebelumnya</span>
      )}
      <span className="font-mono text-[0.75rem] text-muted">
        Halaman {page} dari {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={LINK_CLS}>
          Berikutnya →
        </Link>
      ) : (
        <span className={OFF_CLS}>Berikutnya →</span>
      )}
    </nav>
  );
}
