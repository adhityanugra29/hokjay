"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MONTH_NAMES } from "@/lib/constants";

/**
 * Invoice list's search + filter bar — replaces the always-visible
 * search/Bulan/Tahun/Sales row (and its InvoicePeriodFilter.tsx) per the
 * user's approved mockup 2026-10-02 (docs/SDD/mockups/invoice-list-v1.html):
 * a white search field with an icon, one "Filter" button (with a count
 * badge) that opens a panel holding Bulan/Tahun/Sales, and a removable chip
 * per active filter. Filtering itself is unchanged — still URL params
 * (search/bulan/tahun/sales) read by app/invoice/page.tsx on the server.
 */
export default function InvoiceFilterBar({
  search,
  bulan,
  tahun,
  sales,
  availableMonths,
  availableYears,
  availableSales,
}: {
  search?: string;
  bulan?: number;
  tahun?: number;
  /** Currently selected sales.nama, or undefined for "all". */
  sales?: string;
  /** Month numbers (1-12) that actually have at least one invoice — others are left out entirely, not just disabled. */
  availableMonths: number[];
  /** Years that actually have at least one invoice, newest-first. */
  availableYears: number[];
  /** Roster names; empty for a "sales" session (already pinned to their own invoices — nothing to filter by). */
  availableSales: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const activeCount = (bulan ? 1 : 0) + (tahun ? 1 : 0) + (sales ? 1 : 0);
  const showSales = availableSales.length > 0;

  function setParam(key: "bulan" | "tahun" | "sales", value?: string | number) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, String(value));
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function resetAll() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("bulan");
    params.delete("tahun");
    params.delete("sales");
    router.push(`${pathname}?${params.toString()}`);
  }

  const selectCls =
    "h-[38px] min-w-[150px] rounded-lg border-[1.5px] border-line bg-paper px-2.5 font-sans text-[0.8rem] font-semibold text-ink";
  const labelCls = "flex flex-col gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted";

  const chips: { key: "bulan" | "tahun" | "sales"; label: string }[] = [];
  if (bulan) chips.push({ key: "bulan", label: `Bulan: ${MONTH_NAMES[bulan - 1]}` });
  if (tahun) chips.push({ key: "tahun", label: `Tahun: ${tahun}` });
  if (sales) chips.push({ key: "sales", label: `Sales: ${sales}` });

  return (
    <div className="mb-5 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Native GET form — hidden fields carry the active filters so
            submitting a search never drops them (a plain <form> only sends
            its own named fields). */}
        <form className="flex h-10 min-w-0 flex-1 basis-[260px] items-center gap-2 rounded-[10px] border-[1.5px] border-line bg-panel px-3 focus-within:border-ink">
          {bulan ? <input type="hidden" name="bulan" value={bulan} /> : null}
          {tahun ? <input type="hidden" name="tahun" value={tahun} /> : null}
          {sales ? <input type="hidden" name="sales" value={sales} /> : null}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-muted"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            name="search"
            type="search"
            defaultValue={search}
            placeholder="Cari no. invoice atau pelanggan"
            aria-label="Cari invoice"
            className="h-full min-w-0 flex-1 border-0 bg-transparent font-sans text-[0.85rem] text-ink outline-none placeholder:text-muted"
          />
        </form>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border-[1.5px] px-3.5 font-sans text-[0.8rem] font-extrabold ${
            open ? "border-ink bg-ink text-accent" : "border-line bg-panel text-ink hover:border-accent-600"
          }`}
        >
          Filter
          {activeCount > 0 && (
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 text-[11px] text-ink">
              {activeCount}
            </span>
          )}
          <span aria-hidden="true">{open ? "▴" : "▾"}</span>
        </button>
      </div>

      {open && (
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3 rounded-xl bg-panel px-4 py-3.5 shadow-sm">
          <label className={labelCls}>
            Bulan
            <select
              value={bulan ?? ""}
              onChange={(e) => setParam("bulan", e.target.value ? Number(e.target.value) : undefined)}
              className={selectCls}
            >
              <option value="">Semua bulan</option>
              {MONTH_NAMES.map((name, idx) =>
                availableMonths.includes(idx + 1) ? (
                  <option key={name} value={idx + 1}>
                    {name}
                  </option>
                ) : null
              )}
            </select>
          </label>
          <label className={labelCls}>
            Tahun
            <select
              value={tahun ?? ""}
              onChange={(e) => setParam("tahun", e.target.value ? Number(e.target.value) : undefined)}
              className={selectCls}
            >
              <option value="">Semua tahun</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          {showSales && (
            <label className={labelCls}>
              Sales
              <select
                value={sales ?? ""}
                onChange={(e) => setParam("sales", e.target.value || undefined)}
                className={selectCls}
              >
                <option value="">Semua sales</option>
                {availableSales.map((nama) => (
                  <option key={nama} value={nama}>
                    {nama}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-1.5 rounded-full border border-accent-600 bg-accent-100 py-[3px] pr-1.5 pl-3 font-sans text-[0.75rem] font-bold text-accent-700"
            >
              {c.label}
              <button
                type="button"
                onClick={() => setParam(c.key, undefined)}
                aria-label={`Hapus filter ${c.label}`}
                className="h-[18px] w-[18px] cursor-pointer rounded-full bg-black/10 p-0 text-[11px] leading-[18px]"
              >
                ✕
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={resetAll}
            className="cursor-pointer p-1 font-sans text-[0.75rem] font-bold text-muted underline underline-offset-[3px]"
          >
            Reset semua
          </button>
        </div>
      )}
    </div>
  );
}
