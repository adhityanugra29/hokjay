"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * Which products get included in the "Unduh Katalog (PDF)" brochure —
 * deliberately separate from CartProvider: this is "what goes in the PDF",
 * not "what's being invoiced". Persisted like the cart so a selection
 * survives navigating between /katalog and /katalog/custom.
 */
interface CatalogSelectionContextValue {
  selected: Set<string>;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearAll: () => void;
}

const CatalogSelectionContext = createContext<CatalogSelectionContextValue | null>(null);
const STORAGE_KEY = "horeca-catalog-selection";

export function CatalogSelectionProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSelected(new Set(JSON.parse(raw)));
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify([...selected]));
  }, [selected, hydrated]);

  function isSelected(id: string) {
    return selected.has(id);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll(ids: string[]) {
    setSelected((prev) => {
      // If everything given is already selected, treat it as "deselect all"
      // (mirrors a checkbox's own indeterminate -> checked -> unchecked cycle).
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(ids);
    });
  }

  function clearAll() {
    setSelected(new Set());
  }

  return (
    <CatalogSelectionContext.Provider value={{ selected, isSelected, toggle, selectAll, clearAll }}>
      {children}
    </CatalogSelectionContext.Provider>
  );
}

export function useCatalogSelection() {
  const ctx = useContext(CatalogSelectionContext);
  if (!ctx) throw new Error("useCatalogSelection must be used within CatalogSelectionProvider");
  return ctx;
}
