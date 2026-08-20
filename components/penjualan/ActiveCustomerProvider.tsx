"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * The customer picked on /penjualan before browsing the Katalog — the sales
 * flow now goes "pick customer" -> "pick products" -> "invoice", rather than
 * letting the customer be an afterthought filled in at invoice time. Read by
 * KatalogClient (guard + hero label), CatalogPrintDoc (PDF cover), and
 * InvoiceForm (auto-fills the Pelanggan field). Persisted like the cart so
 * it survives navigating between /katalog, /katalog/custom, etc.
 */
export interface ActiveCustomer {
  id: string;
  nama: string;
  alamat: string;
  whatsapp: string;
}

interface ActiveCustomerContextValue {
  activeCustomer: ActiveCustomer | null;
  /** True once localStorage has been read — guards should wait for this
   * before deciding "no customer" is real and not just un-hydrated yet. */
  hydrated: boolean;
  setActiveCustomer: (customer: ActiveCustomer) => void;
  clearActiveCustomer: () => void;
}

const ActiveCustomerContext = createContext<ActiveCustomerContextValue | null>(null);
const STORAGE_KEY = "horeca-active-customer";

export function ActiveCustomerProvider({ children }: { children: React.ReactNode }) {
  const [activeCustomer, setActiveCustomerState] = useState<ActiveCustomer | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setActiveCustomerState(JSON.parse(raw));
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (activeCustomer) localStorage.setItem(STORAGE_KEY, JSON.stringify(activeCustomer));
    else localStorage.removeItem(STORAGE_KEY);
  }, [activeCustomer, hydrated]);

  function setActiveCustomer(customer: ActiveCustomer) {
    setActiveCustomerState(customer);
  }

  function clearActiveCustomer() {
    setActiveCustomerState(null);
  }

  return (
    <ActiveCustomerContext.Provider value={{ activeCustomer, hydrated, setActiveCustomer, clearActiveCustomer }}>
      {children}
    </ActiveCustomerContext.Provider>
  );
}

export function useActiveCustomer() {
  const ctx = useContext(ActiveCustomerContext);
  if (!ctx) throw new Error("useActiveCustomer must be used within ActiveCustomerProvider");
  return ctx;
}
