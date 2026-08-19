import Link from "next/link";
import type { SortDir } from "@/lib/sort";

/**
 * A `<th>` that's also a link toggling `${paramPrefix}sort`/`${paramPrefix}dir`
 * — preserves every other query param already on the page (including other
 * tables' own prefixed sort state, if the page has more than one).
 */
export default function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  basePath,
  searchParams,
  align = "left",
  className = "",
  paramPrefix = "",
}: {
  label: string;
  sortKey: string;
  currentSort: string;
  currentDir: SortDir;
  basePath: string;
  searchParams?: Record<string, string | string[] | undefined>;
  align?: "left" | "right";
  className?: string;
  paramPrefix?: string;
}) {
  const active = currentSort === sortKey;
  const nextDir: SortDir = active && currentDir === "asc" ? "desc" : "asc";
  const sortParam = `${paramPrefix}sort`;
  const dirParam = `${paramPrefix}dir`;

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams ?? {})) {
    if (k === sortParam || k === dirParam) continue;
    if (typeof v === "string") params.set(k, v);
  }
  params.set(sortParam, sortKey);
  params.set(dirParam, nextDir);

  return (
    <th
      className={`whitespace-nowrap border-b border-line px-5 py-4 font-sans text-[0.8rem] font-medium text-muted ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      <Link
        href={`${basePath}?${params.toString()}`}
        className={`inline-flex select-none items-center gap-1 hover:text-ink ${active ? "text-ink" : ""}`}
      >
        {label}
        <span className={`text-[0.6rem] ${active ? "opacity-100" : "opacity-35"}`}>
          {active ? (currentDir === "asc" ? "▲" : "▼") : "⇅"}
        </span>
      </Link>
    </th>
  );
}
