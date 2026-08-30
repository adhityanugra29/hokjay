"use client";

import { usePathname } from "next/navigation";
import BackHomeControls from "./BackHomeControls";
import { getModuleMeta } from "@/lib/nav";

/**
 * Module header — group breadcrumb ("Jualan"), title, and a one-line
 * plain-language description. Redesigned 2026-08-22 ("Rak & Rel v2" — see
 * the design doc discussed with the user) to replace the old flat "small
 * uppercase eyebrow + title" header. Two things since removed per later
 * user feedback: the group-tab strip that originally sat below this
 * (2026-08-22 — the sidebar's own group headings already show this), and
 * the giant module-index number + "Modul X dari Y" numbering (2026-08-23).
 *
 * Every existing call site only ever passes title/subtitle/actions, so this
 * stays a drop-in replacement: `subtitle` is reused verbatim as the
 * description line on pages that haven't been given bespoke new copy yet.
 *
 * min-h-[100px] + vertical centering matches the sidebar's full-width HOJAY
 * mark (see Logo.tsx's `full` variant) — same 100px reference height, so
 * the sidebar's border and this header's border-b-2 land on the same line
 * across the page on the common case (no subtitle, or a one-line one).
 * min- not a strict height so a longer, wrapping subtitle can still grow
 * the header past 100px on those specific pages instead of clipping.
 */
export default function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const meta = getModuleMeta(pathname);

  return (
    <div className="flex min-h-[100px] flex-col justify-center border-b border-line px-6 py-5 pl-16 md:px-9">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          {meta && (
            <div className="font-sans text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted">
              {meta.groupLabel}
            </div>
          )}
          <h1 className={`font-sans text-[1.6rem] font-extrabold md:text-[1.875rem] ${meta ? "mt-1.5" : ""}`}>
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-[560px] font-sans text-[0.8rem] text-muted">{subtitle}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {actions}
          <BackHomeControls />
        </div>
      </div>
    </div>
  );
}
