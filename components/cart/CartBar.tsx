"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCart } from "./CartProvider";
import { rupiah } from "@/lib/format";

export default function CartBar() {
  const { count, totalEstimate, clear } = useCart();
  const router = useRouter();
  const pathname = usePathname();

  // Matches the mockup: the cart bar only ever appears while browsing the
  // Katalog (and its Custom Order sub-page) — it disappears on every other
  // page even though the cart itself keeps its contents.
  if (!pathname.startsWith("/katalog")) return null;
  if (count === 0) return null;

  return (
    // bottom-[58px] on mobile sits this bar just above the fixed bottom tab
    // bar (MOBILE_TAB_BAR_HEIGHT in components/layout/MobileTabBar.tsx —
    // keep this in sync with that constant) instead of overlapping it;
    // md:bottom-0 since the tab bar only exists below md. Per the user's
    // report 2026-08-25 that the sales flow needed a mobile pass.
    <div className="no-print fixed inset-x-0 bottom-[58px] z-30 flex flex-wrap items-center justify-between gap-3 bg-ink px-4 py-3 text-white sm:px-6 sm:py-3.5 md:bottom-0 md:pl-[254px]">
      <div className="text-[0.78rem] sm:text-[0.82rem]">
        <b className="text-white">{count}</b> produk dipilih — total est. <b>{rupiah(totalEstimate)}</b>
      </div>
      <div className="flex gap-2">
        {/* Clears the whole selection right from the Katalog cart bar,
            next to "Lanjut ke Invoice" — no separate confirm dialog, per
            the user's request 2026-08-27. */}
        <button
          type="button"
          onClick={() => clear()}
          className="border border-white/40 bg-transparent px-4.5 py-2 text-[0.85rem] font-semibold text-white"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={() => router.push("/invoice/baru")}
          className="border border-accent bg-accent px-4.5 py-2 text-[0.85rem] font-semibold text-white"
        >
          Lanjut ke Invoice →
        </button>
      </div>
    </div>
  );
}
