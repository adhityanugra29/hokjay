"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { inputCls } from "./Form";

/**
 * A real dropdown + search combobox — per the user's request 2026-08-25:
 * type to filter, press Enter to pick the topmost filtered option. The
 * native <input list>/<datalist> combo used before this doesn't support
 * "Enter selects the first match" (it just submits whatever text is
 * typed), which is exactly what was asked for, so this replaces it.
 *
 * `value`/`onChange` only ever change through an actual selection (Enter,
 * click, or a single exact text match) — clicking away or blurring
 * without picking snaps the visible text back to the last committed
 * value, so the caller's `value` can never end up holding a half-typed
 * search string.
 *
 * Opening the dropdown clears the search field instead of leaving the
 * current value typed in it — per the user's report 2026-08-27 against
 * Katalog's category filter: its current value can be a synthetic "Semua
 * Kategori" sentinel that isn't one of `options` at all, so on open the
 * text filter matched nothing and the dropdown looked empty. Clearing on
 * open shows every option immediately regardless of what's currently
 * selected, then narrows as the user types — the more expected combobox
 * pattern anyway, applied to every usage of this component for
 * consistency (Katalog's category filter, Pelanggan's Provinsi/Kota,
 * Produk's Kategori), confirmed with the user.
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  emptyLabel = "Tidak ada yang cocok.",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  emptyLabel?: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickAway(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(value);
      }
    }
    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [query, options]);

  function selectOption(opt: string) {
    onChange(opt);
    setQuery(opt);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length > 0) selectOption(filtered[0]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery(value);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={inputCls}
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto border border-line bg-panel shadow-[0_6px_16px_-4px_rgba(0,0,0,0.18)]">
          {filtered.length > 0
            ? filtered.map((opt) => (
                <div
                  key={opt}
                  // onMouseDown (not onClick) + preventDefault — the input's
                  // onBlur/click-away handler otherwise fires first and
                  // closes this dropdown before the click can register.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectOption(opt);
                  }}
                  className={`cursor-pointer px-3.5 py-2 font-sans text-[0.85rem] hover:bg-[#f3f2ec] ${
                    opt === value ? "bg-[#efece3] font-semibold" : ""
                  }`}
                >
                  {opt}
                </div>
              ))
            : (
                <div className="px-3.5 py-2 font-mono text-[0.75rem] text-muted">{emptyLabel}</div>
              )}
        </div>
      )}
    </div>
  );
}
