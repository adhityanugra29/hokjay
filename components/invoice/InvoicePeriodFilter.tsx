"use client";

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
 */
export default function InvoicePeriodFilter({ bulan, tahun, currentYear }: { bulan?: number; tahun?: number; currentYear: number }) {
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

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);
  // Matches SearchInput's own sizing exactly (py-2/text-[0.78rem]) — the
  // shared Select's base padding/font-size (py-2.5/text-[0.9rem], sized
  // for full-width form fields) made these two selects visibly taller
  // than the search box next to them despite the row's own items-center.
  // !-prefixed since both properties are already set once by Select's own
  // base class and same-specificity utilities aren't guaranteed to lose
  // to whichever is listed later in the className string. Per the user's
  // request 2026-09-04 ("rapihkan untuk selevel dengan no invoice").
  const selectCls = "w-auto !py-2 !text-[0.78rem]";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={bulan ?? ""}
        onChange={(e) => update(e.target.value ? Number(e.target.value) : undefined, tahun)}
        className={selectCls}
      >
        <option value="">Semua Bulan</option>
        {MONTH_NAMES.map((name, idx) => (
          <option key={name} value={idx + 1}>
            {name}
          </option>
        ))}
      </Select>
      <Select
        value={tahun ?? ""}
        onChange={(e) => update(bulan, e.target.value ? Number(e.target.value) : undefined)}
        className={selectCls}
      >
        <option value="">Semua Tahun</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
    </div>
  );
}
