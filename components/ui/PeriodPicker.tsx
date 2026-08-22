"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/Form";
import { MONTH_NAMES } from "@/lib/constants";

/**
 * Simple Bulan + Tahun filter, shared by the Akuntansi, Insentif, and
 * Keuangan pages. `allowFullYear` (Akuntansi only, confirmed with the user
 * 2026-08-22) adds a "Setahun Penuh" option that encodes as bulan=0 — every
 * caller parsing `bulan` must treat 0 as "full year", not fall through to
 * a default via `Number(sp.bulan) || fallback` (0 is falsy in JS).
 */
export default function PeriodPicker({
  month,
  year,
  currentYear,
  allowFullYear,
}: {
  month: number;
  year: number;
  currentYear: number;
  allowFullYear?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(nextMonth: number, nextYear: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("bulan", String(nextMonth));
    params.set("tahun", String(nextYear));
    router.push(`${pathname}?${params.toString()}`);
  }

  const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);

  return (
    <div className="mb-5 flex flex-wrap gap-2.5">
      <Select value={month} onChange={(e) => update(Number(e.target.value), year)} className="w-auto">
        {allowFullYear && <option value={0}>Setahun Penuh</option>}
        {MONTH_NAMES.map((name, idx) => (
          <option key={name} value={idx + 1}>
            {name}
          </option>
        ))}
      </Select>
      <Select value={year} onChange={(e) => update(month, Number(e.target.value))} className="w-auto">
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
    </div>
  );
}
