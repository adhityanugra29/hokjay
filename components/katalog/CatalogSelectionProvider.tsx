"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type CatalogPriceMode = "rekomendasi" | "minimum";

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
  // "Pick mode" is the staged product-picking UI on /katalog: the download
  // button starts as a plain "Unduh Katalog (PDF)" with no checkboxes
  // visible; clicking it reveals per-card checkboxes + "Pilih Semua" and
  // only then does the button turn into the real download trigger. Kept
  // here (not local state in KatalogClient) so ProductCard can read it too.
  pickMode: boolean;
  startPicking: () => void;
  cancelPicking: () => void;
  // Which price every selected item shows in the PDF by default — a global
  // toggle (per the user's request 2026-08-25), overridable per item via
  // customPrices. Read by both ProductCard (the toggle UI + per-item
  // override input live there) and CatalogPrintDoc (what actually prints).
  priceMode: CatalogPriceMode;
  setPriceMode: (mode: CatalogPriceMode) => void;
  customPrices: Record<string, number>;
  setCustomPrice: (id: string, price: number | undefined) => void;
  getEffectivePrice: (product: { _id: string; hargaRekomendasi: number; hargaMinimum: number }) => number;
}

const CatalogSelectionContext = createContext<CatalogSelectionContextValue | null>(null);
const STORAGE_KEY = "horeca-catalog-selection";
const PRICE_MODE_KEY = "horeca-catalog-price-mode";
const CUSTOM_PRICES_KEY = "horeca-catalog-custom-prices";

export function CatalogSelectionProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [pickMode, setPickMode] = useState(false);
  const [priceMode, setPriceModeState] = useState<CatalogPriceMode>("rekomendasi");
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSelected(new Set(JSON.parse(raw)));
      const rawMode = localStorage.getItem(PRICE_MODE_KEY);
      if (rawMode === "rekomendasi" || rawMode === "minimum") setPriceModeState(rawMode);
      const rawCustom = localStorage.getItem(CUSTOM_PRICES_KEY);
      if (rawCustom) setCustomPrices(JSON.parse(rawCustom));
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify([...selected]));
  }, [selected, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(PRICE_MODE_KEY, priceMode);
  }, [priceMode, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(CUSTOM_PRICES_KEY, JSON.stringify(customPrices));
  }, [customPrices, hydrated]);

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

  function startPicking() {
    setPickMode(true);
  }

  function cancelPicking() {
    setPickMode(false);
    clearAll();
    setCustomPrices({});
  }

  function setPriceMode(mode: CatalogPriceMode) {
    setPriceModeState(mode);
  }

  function setCustomPrice(id: string, price: number | undefined) {
    setCustomPrices((prev) => {
      const next = { ...prev };
      if (price === undefined) delete next[id];
      else next[id] = price;
      return next;
    });
  }

  function getEffectivePrice(product: { _id: string; hargaRekomendasi: number; hargaMinimum: number }) {
    if (customPrices[product._id] !== undefined) return customPrices[product._id];
    return priceMode === "minimum" ? product.hargaMinimum : product.hargaRekomendasi;
  }

  return (
    <CatalogSelectionContext.Provider
      value={{
        selected,
        isSelected,
        toggle,
        selectAll,
        clearAll,
        pickMode,
        startPicking,
        cancelPicking,
        priceMode,
        setPriceMode,
        customPrices,
        setCustomPrice,
        getEffectivePrice,
      }}
    >
      {children}
    </CatalogSelectionContext.Provider>
  );
}

export function useCatalogSelection() {
  const ctx = useContext(CatalogSelectionContext);
  if (!ctx) throw new Error("useCatalogSelection must be used within CatalogSelectionProvider");
  return ctx;
}
