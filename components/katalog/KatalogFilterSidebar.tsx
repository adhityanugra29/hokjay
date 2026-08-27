"use client";

import { useEffect } from "react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { CurrencyInput } from "@/components/ui/Form";

const ALL_CATEGORIES_LABEL = "Semua Kategori";

export type KondisiFilter = "" | "baru" | "bekas";
export type TipeFilter = "" | "elektronik" | "non-elektronik";

export interface KatalogFilters {
  category: string;
  kondisi: KondisiFilter;
  tipe: TipeFilter;
  hargaMin: string;
  hargaMax: string;
}

export const EMPTY_KATALOG_FILTERS: KatalogFilters = {
  category: "",
  kondisi: "",
  tipe: "",
  hargaMin: "",
  hargaMax: "",
};

/** How many of the sidebar's filters are set away from "Semua" — shown as a badge on the Filter button. */
export function countActiveFilters(f: KatalogFilters): number {
  let n = 0;
  if (f.category) n++;
  if (f.kondisi) n++;
  if (f.tipe) n++;
  if (f.hargaMin || f.hargaMax) n++;
  return n;
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`cursor-pointer border px-3 py-1.5 font-mono text-[0.72rem] font-semibold ${
            value === opt.value ? "border-accent bg-accent text-white" : "border-line text-ink hover:bg-[#f3f2ec]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Replaces the old plain "Semua Kategori" dropdown in the Katalog filter
 * row — a "Filter" button now opens this sidebar with Kategori, Kondisi
 * (Baru/Bekas/Semua), Tipe (Electric/Non-Electric/Semua), and Range Harga,
 * all defaulting to "Semua" (no restriction). Per the user's request
 * 2026-08-27, confirmed before building. Filters apply live as they're
 * changed — no separate "Terapkan" button, matching how search/sort
 * already behave elsewhere on this page.
 */
export default function KatalogFilterSidebar({
  open,
  onClose,
  categories,
  filters,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  categories: string[];
  filters: KatalogFilters;
  onChange: (next: KatalogFilters) => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const activeCount = countActiveFilters(filters);

  return (
    <div className="no-print fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-sm flex-col overflow-y-auto border-l-2 border-ink bg-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-ink bg-surface px-5 py-4">
          <h2 className="font-sans text-[0.95rem] font-extrabold text-ink">Filter Produk</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-9 w-9 cursor-pointer items-center justify-center border border-line text-lg text-ink hover:border-accent hover:text-accent"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-6 p-5">
          <div>
            <label className="mb-2 block font-mono text-[0.7rem] uppercase tracking-wide text-muted">Kategori</label>
            <SearchableSelect
              value={filters.category || ALL_CATEGORIES_LABEL}
              onChange={(v) => onChange({ ...filters, category: v === ALL_CATEGORIES_LABEL ? "" : v })}
              options={[ALL_CATEGORIES_LABEL, ...categories]}
              placeholder={ALL_CATEGORIES_LABEL}
            />
          </div>

          <div>
            <label className="mb-2 block font-mono text-[0.7rem] uppercase tracking-wide text-muted">Kondisi</label>
            <SegmentedControl
              value={filters.kondisi}
              onChange={(v) => onChange({ ...filters, kondisi: v })}
              options={[
                { value: "", label: "Semua" },
                { value: "baru", label: "Baru" },
                { value: "bekas", label: "Bekas" },
              ]}
            />
          </div>

          <div>
            <label className="mb-2 block font-mono text-[0.7rem] uppercase tracking-wide text-muted">Tipe</label>
            <SegmentedControl
              value={filters.tipe}
              onChange={(v) => onChange({ ...filters, tipe: v })}
              options={[
                { value: "", label: "Semua" },
                { value: "elektronik", label: "Electric" },
                { value: "non-elektronik", label: "Non-Electric" },
              ]}
            />
          </div>

          <div>
            <label className="mb-2 block font-mono text-[0.7rem] uppercase tracking-wide text-muted">
              Range Harga
            </label>
            <div className="flex items-center gap-2">
              <CurrencyInput
                value={filters.hargaMin}
                onChange={(v) => onChange({ ...filters, hargaMin: v })}
                placeholder="Min"
              />
              <span className="text-muted">—</span>
              <CurrencyInput
                value={filters.hargaMax}
                onChange={(v) => onChange({ ...filters, hargaMax: v })}
                placeholder="Max"
              />
            </div>
          </div>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => onChange(EMPTY_KATALOG_FILTERS)}
              className="cursor-pointer border border-line py-2.5 text-center font-mono text-[0.75rem] font-semibold text-muted hover:border-accent hover:text-accent"
            >
              Reset Semua Filter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
