"use client";

import { use } from "react";
import type { NavBadgeCounts } from "./AppShell";

/**
 * Renders one nav item's badge chip (Invoice's unpaid count, Inventory's
 * "Produk Baru" count) — split out into its own component so it alone can
 * suspend on the counts promise (via React's use()) while the rest of the
 * nav item (icon, label, link) renders immediately. Wrapped by the caller
 * in <Suspense fallback={null}> — per the user's request 2026-08-28 to
 * speed up navigation: this badge data used to be awaited in the root
 * layout in front of every single page's own content, for 3-4 extra
 * MongoDB round trips that have nothing to do with most pages being
 * visited.
 */
export default function NavBadge({
  type,
  active,
  promise,
}: {
  type: "invoiceCount" | "produkBaru";
  active: boolean;
  promise: Promise<NavBadgeCounts>;
}) {
  const counts = use(promise);
  const value = type === "invoiceCount" ? counts.invoiceCount : counts.produkBaru;
  if (value <= 0) return null;

  if (type === "invoiceCount") {
    return (
      <span
        className={`px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-white text-accent" : "bg-accent text-white"}`}
      >
        {value}
      </span>
    );
  }

  return (
    <span
      className={`border px-1.5 py-0.5 text-[10px] font-semibold ${
        active ? "border-white/60 text-white" : "border-white/30 text-white/70"
      }`}
    >
      {value} Produk Baru
    </span>
  );
}
