"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  canGoBack,
  canGoForward,
  parsePeriode,
  periodeLabel,
  shiftPeriode,
} from "@/lib/payrollPeriod";

const TABS = [
  { href: "/payroll", label: "Komisi", perPeriode: false },
  { href: "/payroll/gaji", label: "Gaji", perPeriode: true },
  { href: "/payroll/karyawan", label: "Karyawan", perPeriode: false },
  { href: "/payroll/absensi", label: "Absensi", perPeriode: true },
  { href: "/payroll/riwayat", label: "Riwayat", perPeriode: true },
];

const arrowCls =
  "flex h-9 w-9 items-center justify-center rounded-full text-ink no-underline transition hover:bg-surface";

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === "left" ? "M12.5 4.5 7 10l5.5 5.5" : "M7.5 4.5 13 10l-5.5 5.5"} />
    </svg>
  );
}

/**
 * Payroll's subnav: the five tab pills plus ONE shared month stepper, shown
 * only on the tabs that work per period (Gaji, Absensi, Riwayat). The chosen
 * month lives in the URL (`?periode=YYYY-MM`) and is carried across those
 * tabs, so switching tab keeps the month. Komisi (a running balance — a month
 * filter could hide unpaid commission) and Karyawan (a roster) have no
 * stepper. Riwayat also has an "all periods" mode (no param) because that is
 * how it has always opened.
 */
export default function PayrollNav({ current }: { current: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = parsePeriode(searchParams.get("periode"), current);

  const activeTab = TABS.find((t) => t.href === pathname);
  const isRiwayat = pathname === "/payroll/riwayat";
  const allMode = isRiwayat && !selected;
  const month = selected ?? current;

  const hrefFor = (periode: string) => `${pathname}?periode=${periode}`;
  const prev = shiftPeriode(month, -1);
  const next = shiftPeriode(month, 1);

  return (
    <div className="mb-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4">
      <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="Bagian Payroll">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          const href = tab.perPeriode && selected ? `${tab.href}?periode=${selected}` : tab.href;
          return (
            <Link
              key={tab.href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 font-sans text-[0.8rem] font-bold no-underline ${
                active ? "bg-ink text-paper" : "bg-surface text-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {activeTab?.perPeriode && (
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Periode Payroll" className="inline-flex items-center rounded-full bg-panel p-[3px] shadow-sm">
            {!allMode && canGoBack(month, current) ? (
              <Link href={hrefFor(prev)} className={arrowCls} aria-label="Bulan sebelumnya">
                <Chevron dir="left" />
              </Link>
            ) : (
              <span className={`${arrowCls} opacity-30`} aria-hidden="true">
                <Chevron dir="left" />
              </span>
            )}
            <div className="min-w-[132px] text-center font-sans text-[0.86rem] font-extrabold leading-[1.15]">
              {allMode ? "Semua periode" : periodeLabel(month)}
              {!allMode && month === current && (
                <small className="block text-[10px] font-bold uppercase tracking-[0.06em] text-accent-700">Berjalan</small>
              )}
            </div>
            {!allMode && canGoForward(month, current) ? (
              <Link href={hrefFor(next)} className={arrowCls} aria-label="Bulan berikutnya">
                <Chevron dir="right" />
              </Link>
            ) : (
              <span className={`${arrowCls} opacity-30`} aria-hidden="true">
                <Chevron dir="right" />
              </span>
            )}
          </nav>
          {isRiwayat && (
            <Link
              href={allMode ? hrefFor(current) : pathname}
              className="rounded-full border border-line px-3 py-1.5 font-sans text-[0.75rem] font-bold text-ink no-underline hover:bg-surface"
            >
              {allMode ? "Pilih satu bulan" : "Semua periode"}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
