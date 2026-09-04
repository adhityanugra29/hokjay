"use client";

import { Fragment } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/Form";
import { MONTH_NAMES } from "@/lib/constants";

/**
 * Bulan/Tahun filter for the Invoice list — per the user's request
 * 2026-09-04 ("tambahkan di html itu periode, supaya user bisa untuk
 * filter bulanya"). Not the shared PeriodPicker.tsx (Akuntansi/Insentif/
 * Keuangan) — those always pin to a specific month/year with no "show
 * everything" state, but Invoice's default (and most common) view is
 * unfiltered across all history, so both selects default to "Semua"
 * instead. Navigates by updating bulan/tahun URL params (empty = removed,
 * i.e. "Semua"), preserving whatever else is already in the URL (the
 * search box's own `search` param).
 *
 * Renders a Fragment, not a wrapping <div> — per the user's report
 * 2026-09-04 ("masa peletakanya seperti ini? ... sangat disfunction") that
 * the two selects stacked into their own row instead of sitting level with
 * the search box. Root cause: this component's own flex-wrap div, nested
 * inside app/invoice/page.tsx's already-flex-wrap filter row, gave the
 * browser a starved inner width to wrap against even though the outer row
 * had plenty of room — confirmed via live DOM measurement. A Fragment
 * makes both <Select>s direct flex-item siblings of the search <form> in
 * that single outer row, removing the nested-wrap computation entirely.
 * Plan reviewed with the user as an HTML mockup before this was applied
 * ("buat dulu planya di html" -> "untuk periode di invoice, tolong
 * proceed dari html ya").
 */
export default function InvoicePeriodFilter({
  bulan,
  tahun,
  availableMonths,
  availableYears,
}: {
  bulan?: number;
  tahun?: number;
  /** Month numbers (1-12) that actually have at least one invoice — others are left out of the dropdown entirely, not just disabled. */
  availableMonths: number[];
  /** Years that actually have at least one invoice, already sorted newest-first. */
  availableYears: number[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(nextBulan?: number, nextTahun?: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextBulan) params.set("bulan", String(nextBulan));
    else params.delete("bulan");
    if (nextTahun) params.set("tahun", String(nextTahun));
    else params.delete("tahun");
    router.push(`${pathname}?${params.toString()}`);
  }

  // Matches SearchInput's own sizing exactly (py-2/text-[0.78rem]) — the
  // shared Select's base class (w-full, py-2.5/text-[0.9rem], sized for
  // full-width form fields) made these two selects both visibly taller
  // AND full-width, which is what was actually forcing them onto their
  // own row below the search box even after this component stopped
  // wrapping them in an extra div — a same-specificity `w-auto` here
  // doesn't reliably beat the base class's `w-full` (Tailwind resolves
  // ties by the two classes' order in the generated stylesheet, not by
  // where they appear in this string), so every override below is
  // !-prefixed. Per the user's request 2026-09-04 ("rapihkan untuk
  // selevel dengan no invoice").
  const selectCls = "!w-auto !py-2 !text-[0.78rem]";

  return (
    <Fragment>
      <Select
        value={bulan ?? ""}
        onChange={(e) => update(e.target.value ? Number(e.target.value) : undefined, tahun)}
        className={selectCls}
      >
        <option value="">Semua Bulan</option>
        {MONTH_NAMES.map((name, idx) =>
          availableMonths.includes(idx + 1) ? (
            <option key={name} value={idx + 1}>
              {name}
            </option>
          ) : null
        )}
      </Select>
      <Select
        value={tahun ?? ""}
        onChange={(e) => update(bulan, e.target.value ? Number(e.target.value) : undefined)}
        className={selectCls}
      >
        <option value="">Semua Tahun</option>
        {availableYears.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
    </Fragment>
  );
}
