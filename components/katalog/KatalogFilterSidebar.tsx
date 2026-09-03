"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CurrencyInput, Input, inputCls } from "@/components/ui/Form";

export type KondisiFilter = "" | "baru" | "bekas";
export type TipeFilter = "" | "elektronik" | "non-elektronik";
export type HargaBasis = "rekomendasi" | "minimum";

export interface KatalogFilters {
  /** Empty = "Semua Kategori". More than one category can be checked at once — per the user's request 2026-08-29. */
  categories: string[];
  kondisi: KondisiFilter;
  tipe: TipeFilter;
  hargaMin: string;
  hargaMax: string;
  /** Which price field Range Harga compares against — per the user's request 2026-08-28. */
  hargaBasis: HargaBasis;
  /** Manual free-text name filter — separate from the main search box, per the user's request 2026-08-28. */
  nama: string;
  /** Manual free-text/number size filter (matches P, L, or T in cm). */
  ukuran: string;
  /** Only products added within lib/constants.ts's PRODUK_BARU_DAYS that haven't sold yet. Per the user's request 2026-08-28. */
  produkBaru: boolean;
}

export const EMPTY_KATALOG_FILTERS: KatalogFilters = {
  categories: [],
  kondisi: "",
  tipe: "",
  hargaMin: "",
  hargaMax: "",
  hargaBasis: "rekomendasi",
  nama: "",
  ukuran: "",
  produkBaru: false,
};

/** How many of the sidebar's filters are set away from "Semua" — shown as a badge on the Filter button. */
export function countActiveFilters(f: KatalogFilters): number {
  let n = 0;
  if (f.categories.length > 0) n++;
  if (f.kondisi) n++;
  if (f.tipe) n++;
  if (f.hargaMin || f.hargaMax) n++;
  if (f.nama) n++;
  if (f.ukuran) n++;
  if (f.produkBaru) n++;
  return n;
}

/**
 * Dropdown, not a permanently-visible checkbox list — per the user's
 * correction 2026-08-29 ("jangan menjadi check box, ini akan menjadi
 * kotor filternya, buat saja multiple tapi tetap dropdown"). Same visual
 * language as SearchableSelect (trigger styled like a normal input, panel
 * below it), but the trigger shows a summary ("Semua Kategori" / one name
 * / "N kategori dipilih") instead of the raw value, and each row is a
 * checkbox so more than one can stay picked without the panel closing.
 */
function CategoryMultiSelect({
  categories,
  selected,
  onChange,
}: {
  categories: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickAway(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.toLowerCase().includes(q));
  }, [query, categories]);

  function toggle(cat: string) {
    onChange(selected.includes(cat) ? selected.filter((c) => c !== cat) : [...selected, cat]);
  }

  const summary =
    selected.length === 0
      ? "Semua Kategori"
      : selected.length === 1
        ? selected[0]
        : `${selected.length} kategori dipilih`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${inputCls} flex cursor-pointer items-center justify-between text-left`}
      >
        <span className={`truncate ${selected.length === 0 ? "text-muted" : ""}`}>{summary}</span>
        <span className="ml-2 shrink-0 text-muted">▾</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full border border-line bg-panel shadow-[0_6px_16px_-4px_rgba(0,0,0,0.18)]">
          <div className="border-b border-line p-2">
            <input
              type="text"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari kategori..."
              className={inputCls}
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((cat) => (
                <label
                  key={cat}
                  className="flex cursor-pointer items-center gap-2 px-3.5 py-2 font-sans text-[0.85rem] select-none hover:bg-[#f3f2ec]"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(cat)}
                    onChange={() => toggle(cat)}
                    className="h-4 w-4 accent-accent"
                  />
                  {cat}
                </label>
              ))
            ) : (
              <div className="px-3.5 py-2 font-mono text-[0.75rem] text-muted">Tidak ada yang cocok.</div>
            )}
          </div>
          {selected.length > 0 && (
            <div className="border-t border-line p-2">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full cursor-pointer py-1 text-center font-mono text-[0.72rem] font-semibold text-accent-700 hover:underline"
              >
                Kosongkan pilihan
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
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
            value === opt.value ? "border-accent bg-accent text-ink" : "border-line text-ink hover:bg-[#f3f2ec]"
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
        className="flex h-full w-full max-w-sm flex-col overflow-y-auto bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line bg-surface px-5 py-4">
          <h2 className="font-sans text-[0.95rem] font-extrabold text-ink">Filter Produk</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-9 w-9 cursor-pointer items-center justify-center border border-line text-lg text-ink hover:border-accent hover:text-accent-700"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-6 p-5">
          {/* Products added within lib/constants.ts's PRODUK_BARU_DAYS
              that haven't sold yet — same rule as the Inventory nav
              badge. Per the user's request 2026-08-28. */}
          <label className="flex cursor-pointer items-center gap-2 text-[0.85rem] text-ink select-none">
            <input
              type="checkbox"
              checked={filters.produkBaru}
              onChange={(e) => onChange({ ...filters, produkBaru: e.target.checked })}
              className="h-4 w-4 accent-accent"
            />
            Hanya Produk Baru
          </label>

          {/* Manual free-text filters — separate from the main search box
              above the grid, per the user's request 2026-08-28. */}
          <div>
            <label className="mb-2 block font-mono text-[0.7rem] uppercase tracking-wide text-muted">
              Nama Produk
            </label>
            <Input
              value={filters.nama}
              onChange={(e) => onChange({ ...filters, nama: e.target.value })}
              placeholder="Ketik nama produk..."
            />
          </div>

          <div>
            <label className="mb-2 block font-mono text-[0.7rem] uppercase tracking-wide text-muted">Ukuran</label>
            <Input
              value={filters.ukuran}
              onChange={(e) => onChange({ ...filters, ukuran: e.target.value })}
              placeholder="Contoh: 80 x 60 x 100 (cm, P/L/T)"
            />
          </div>

          <div>
            <label className="mb-2 block font-mono text-[0.7rem] uppercase tracking-wide text-muted">Kategori</label>
            {/* Dropdown that allows more than one category checked at once
                — per the user's request 2026-08-29 ("bisa multiple
                produk"), then corrected the same day to stay a dropdown
                rather than a permanently-visible checkbox list. Empty
                selection still means "Semua Kategori", same as before. */}
            <CategoryMultiSelect
              categories={categories}
              selected={filters.categories}
              onChange={(next) => onChange({ ...filters, categories: next })}
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
            {/* Which price field the range above compares against — per
                the user's request 2026-08-28. */}
            <div className="mt-2">
              <SegmentedControl
                value={filters.hargaBasis}
                onChange={(v) => onChange({ ...filters, hargaBasis: v })}
                options={[
                  { value: "rekomendasi", label: "Harga Rekomendasi" },
                  { value: "minimum", label: "Harga Bottom" },
                ]}
              />
            </div>
          </div>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => onChange(EMPTY_KATALOG_FILTERS)}
              className="cursor-pointer border border-line py-2.5 text-center font-mono text-[0.75rem] font-semibold text-muted hover:border-accent hover:text-accent-700"
            >
              Reset Semua Filter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
