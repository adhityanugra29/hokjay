"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavIcon, { type NavIconName } from "./NavIcons";
import { getModuleMeta } from "@/lib/nav";
import { isAllowedPage } from "@/lib/auth/access";
import type { UserRole } from "@/models/User";

/**
 * Bottom tab bar — mobile-only nav ("7" in the 2026-08-24 mobile design doc,
 * "nav bar" instruction applies this to every page, not just 7a/7e/7f/7g).
 * Replaces the hamburger + sliding sidebar below the md breakpoint; the
 * desktop sidebar (AppShell's <aside>) is untouched above it.
 *
 * Each group tab lands on the first page within that group the current
 * role can actually reach (isAllowedPage), so the bar degrades gracefully
 * per role instead of linking somewhere that 403s. Active state reuses
 * getModuleMeta — the same source of truth the desktop sidebar/PageHeader
 * already use — so it lights up correctly even on sub-pages (e.g.
 * /invoice/[id] still highlights "Jualan").
 */
const GROUP_CANDIDATES: Record<string, string[]> = {
  Jualan: ["/penjualan", "/katalog", "/invoice", "/pelanggan", "/insentif"],
  Barang: ["/produk", "/purchasing", "/inventaris-kantor"],
  Uang: ["/keuangan", "/akuntansi", "/payroll", "/bayar-tagihan"],
};
const GROUP_ICON: Record<string, NavIconName> = { Jualan: "cart", Barang: "box", Uang: "cashbox" };

interface Tab {
  key: string;
  href: string;
  label: string;
  icon: NavIconName;
  groupLabel?: string;
}

export default function MobileTabBar({ role }: { role: UserRole }) {
  const pathname = usePathname();

  if (pathname === "/login") return null;
  const meta = getModuleMeta(pathname);

  const groupTabs: Tab[] = (["Jualan", "Barang", "Uang"] as const).flatMap((label) => {
    const href = GROUP_CANDIDATES[label].find((h) => isAllowedPage(role, h));
    return href ? [{ key: label, href, label, icon: GROUP_ICON[label], groupLabel: label }] : [];
  });

  const tabs: Tab[] = [
    { key: "beranda", href: "/", label: "Beranda", icon: "home" },
    ...groupTabs,
    { key: "menu", href: "/menu", label: "Menu", icon: "menu" },
  ];

  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-40 grid border-t border-white/15 bg-ink md:hidden"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map((tab) => {
        const active =
          tab.key === "beranda"
            ? pathname === "/"
            : tab.key === "menu"
              ? pathname === "/menu" || pathname.startsWith("/menu/")
              : meta?.groupLabel === tab.groupLabel;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={`flex min-h-[44px] flex-col items-center gap-[5px] border-t-[3px] py-[9px] pb-3 text-[9.5px] no-underline ${
              active ? "border-t-accent font-bold text-white" : "border-t-transparent font-semibold text-white/50"
            }`}
          >
            <NavIcon name={tab.icon} size={19} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Fixed height of the mobile tab bar (icon+label+padding, no safe-area) — pages with their own fixed bottom action bar on mobile should sit at this offset instead of bottom-0. */
export const MOBILE_TAB_BAR_HEIGHT = 58;
