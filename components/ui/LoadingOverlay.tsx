"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Full-screen "Mohon menunggu" overlay — per the user's request 2026-08-25
 * (wording updated same day from an earlier "Tunggu Sebentar ya"). Applies
 * on every screen size, including mobile's bottom tab bar / SubnavTabs
 * navigation — those are still real route changes, so they hit the same
 * app/loading.tsx boundary as any other page-to-page navigation. Three ways
 * this shows up:
 *   1. Automatically on every page-to-page navigation, via app/loading.tsx
 *      (Next.js's built-in route-transition boundary — every page here does
 *      a real DB fetch, so this covers "pindah page" everywhere for free).
 *   2. On demand from any client component, via useLoadingOverlay()'s
 *      show()/hide() (or the withLoading(promise) convenience wrapper) —
 *      for a specific long-running action outside of navigation.
 *   3. Automatically on ANY fetch() that's still in flight after 2 seconds
 *      (patchFetchForLoadingOverlay below) — per the user's report
 *      2026-08-25 that the popup "sering tidak muncul": most of this app's
 *      genuinely slow actions (saving a form, uploading a photo, building
 *      the Katalog PDF) are in-page fetch() calls that finish *before* any
 *      route navigation happens, so (1) never sees them and nothing was
 *      manually wired to (2) for most forms — this patch covers all of
 *      them at once with no per-form changes. A fetch can opt out (for
 *      deliberately-invisible background work, e.g. CatalogPrintDoc's
 *      self-fetch) by sending an "X-Loading-Overlay: silent" header.
 */

const SILENT_HEADER = "X-Loading-Overlay";
const SILENT_VALUE = "silent";
const SLOW_THRESHOLD_MS = 2000;

// Module-scoped so the patch (installed once, at import time — see below)
// can reach whichever LoadingOverlayProvider instance is currently mounted,
// without needing the fetch patch itself to be a React hook.
let globalShow: (() => void) | null = null;
let globalHide: (() => void) | null = null;

declare global {
  interface Window {
    __loadingOverlayFetchPatched?: boolean;
  }
}

// Runs once when this module is first evaluated (client bundle load), which
// happens before any component's effects — patching inside a useEffect
// instead would miss fetches fired by components that mount/effect before
// LoadingOverlayProvider's own effect does (children run before parents).
// Guarded against double-patching on Fast Refresh during dev.
if (typeof window !== "undefined" && !window.__loadingOverlayFetchPatched) {
  window.__loadingOverlayFetchPatched = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (headers.get(SILENT_HEADER) === SILENT_VALUE) {
      headers.delete(SILENT_HEADER);
      return originalFetch(input, { ...init, headers });
    }
    let shown = false;
    const timer = setTimeout(() => {
      shown = true;
      globalShow?.();
    }, SLOW_THRESHOLD_MS);
    try {
      return await originalFetch(input, init);
    } finally {
      clearTimeout(timer);
      if (shown) globalHide?.();
    }
  }) as typeof fetch;
}
export function LoadingOverlayContent() {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40">
      <div className="flex flex-col items-center gap-3.5 border-2 border-ink bg-panel px-8 py-7 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.35)]">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-line border-t-accent" />
        <div className="font-sans text-[0.9rem] font-semibold text-ink">Mohon menunggu...</div>
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
  const pathname = usePathname();

  // Whenever the route actually changes, whatever a caller was showing this
  // overlay for has resolved — clear it here instead of trusting the
  // triggering component to call hide() itself. A component that calls
  // show() right before router.push() can get unmounted BY that very
  // navigation before it ever observes the transition finishing (e.g. via
  // useTransition's isPending), so hide() sometimes never ran — the
  // overlay was reported stuck showing on the destination page 2026-08-28.
  // This is the reliable fallback: the provider itself lives in the root
  // layout and never unmounts across navigation, so it's always around to
  // see the pathname actually land.
  useEffect(() => {
    setCount(0);
  }, [pathname]);

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

  // Registers this instance's show/hide for the module-level fetch patch
  // above to call into — there's only ever one LoadingOverlayProvider
  // mounted (near the root, never unmounted in normal use).
  useEffect(() => {
    globalShow = show;
    globalHide = hide;
    return () => {
      globalShow = null;
      globalHide = null;
    };
  }, []);

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
