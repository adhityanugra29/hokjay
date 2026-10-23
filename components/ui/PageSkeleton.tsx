"use client";

import { usePathname } from "next/navigation";
import { getModuleMeta, getNavLabel } from "@/lib/nav";
import { SkeletonBlock } from "./Skeleton";

/**
 * Instant fallback for every route's loading.tsx: the same header band as PageHeader (module breadcrumb + title from the nav label, so it lines up with the
 * real header when the page streams in) plus a few pulsing blocks. Rendered the moment a link is clicked (the fallback is prefetched), so navigation never
 * looks blocked while the server and database work.
 */
export default function PageSkeleton() {
  const pathname = usePathname();
  const meta = getModuleMeta(pathname);
  const title = getNavLabel(pathname);

  return (
    <div aria-busy="true" aria-live="polite">
      <div className="flex min-h-[100px] flex-col justify-center border-b border-line px-6 py-5 pl-16 md:px-9">
        {meta && (
          <div className="font-sans text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted">{meta.groupLabel}</div>
        )}
        {title ? (
          <h1 className={`font-sans text-[1.6rem] font-extrabold md:text-[1.875rem] ${meta ? "mt-1.5" : ""}`}>{title}</h1>
        ) : (
          <SkeletonBlock className="h-8 w-48" />
        )}
      </div>
      <div className="space-y-4 p-6 md:p-9">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <SkeletonBlock className="h-20" />
          <SkeletonBlock className="h-20" />
          <SkeletonBlock className="hidden h-20 md:block" />
          <SkeletonBlock className="hidden h-20 md:block" />
        </div>
        <SkeletonBlock className="h-10 w-full max-w-md" />
        <div className="space-y-2.5">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonBlock key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
