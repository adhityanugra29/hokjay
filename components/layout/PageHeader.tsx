"use client";

import { usePathname } from "next/navigation";
import BackHomeControls from "./BackHomeControls";
import { getModuleMeta, NAV_GROUP_LABELS } from "@/lib/nav";

/**
 * Module header — giant colored index number, group breadcrumb ("Jualan ·
 * Modul 03 dari 14"), title, and a one-line plain-language description,
 * plus the group-tab strip below showing where this page sits. Redesigned
 * 2026-08-22 ("Rak & Rel v2" — see the design doc discussed with the user)
 * to replace the old flat "small uppercase eyebrow + title" header.
 *
 * Every existing call site only ever passes title/subtitle/actions, so this
 * stays a drop-in replacement: `subtitle` is reused verbatim as the
 * description line on pages that haven't been given bespoke new copy yet.
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
    <div className="border-b-2 border-ink px-6 pt-[22px] pl-16 md:px-9 md:pt-[26px]">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-start gap-4 md:gap-5">
          {meta && (
            <div className="hidden font-sans text-[48px] leading-[0.78] font-extrabold tracking-tighter text-accent sm:block md:text-[60px]">
              {String(meta.index).padStart(2, "0")}
            </div>
          )}
          <div>
            {meta && (
              <div className="font-sans text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted">
                {meta.groupLabel} · Modul {meta.index} dari {meta.total}
              </div>
            )}
            <h1 className={`font-sans text-[1.6rem] font-extrabold md:text-[1.875rem] ${meta ? "mt-1.5" : ""}`}>
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 max-w-[560px] font-sans text-[0.8rem] text-muted">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {actions}
          <BackHomeControls />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-0">
        {NAV_GROUP_LABELS.map((label) => {
          const isCurrent = meta?.groupLabel === label;
          return (
            <span
              key={label}
              className={`-mb-[2px] mr-5 border-b-[3px] pb-2 font-sans text-[10.5px] font-medium uppercase tracking-[0.14em] ${
                isCurrent ? "border-accent font-bold text-accent" : "border-transparent text-muted/70"
              }`}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
