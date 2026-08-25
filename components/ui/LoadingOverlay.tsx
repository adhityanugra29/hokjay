"use client";

import { createContext, useContext, useState } from "react";

/**
 * Full-screen "Tunggu Sebentar ya" overlay — per the user's request
 * 2026-08-25. Two ways this shows up:
 *   1. Automatically on every page-to-page navigation, via app/loading.tsx
 *      (Next.js's built-in route-transition boundary — every page here does
 *      a real DB fetch, so this covers "pindah page" everywhere for free).
 *   2. On demand from any client component, via useLoadingOverlay()'s
 *      show()/hide() (or the withLoading(promise) convenience wrapper) —
 *      for a specific long-running action outside of navigation.
 */
export function LoadingOverlayContent() {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40">
      <div className="flex flex-col items-center gap-3.5 border-2 border-ink bg-panel px-8 py-7 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.35)]">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-line border-t-accent" />
        <div className="font-sans text-[0.9rem] font-semibold text-ink">Tunggu sebentar ya...</div>
      </div>
    </div>
  );
}

interface LoadingOverlayContextValue {
  show: () => void;
  hide: () => void;
  withLoading: <T>(promise: Promise<T>) => Promise<T>;
}

const LoadingOverlayContext = createContext<LoadingOverlayContextValue | null>(null);

export function LoadingOverlayProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);

  function show() {
    setCount((c) => c + 1);
  }
  function hide() {
    setCount((c) => Math.max(0, c - 1));
  }
  async function withLoading<T>(promise: Promise<T>): Promise<T> {
    show();
    try {
      return await promise;
    } finally {
      hide();
    }
  }

  return (
    <LoadingOverlayContext.Provider value={{ show, hide, withLoading }}>
      {children}
      {count > 0 && <LoadingOverlayContent />}
    </LoadingOverlayContext.Provider>
  );
}

export function useLoadingOverlay() {
  const ctx = useContext(LoadingOverlayContext);
  if (!ctx) throw new Error("useLoadingOverlay must be used within LoadingOverlayProvider");
  return ctx;
}
