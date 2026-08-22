/**
 * Grouped sidebar navigation — replaces the old flat, numbered NAV_ITEMS
 * (see lib/constants.ts pre-2026-08-22) with icon+label rows under
 * Jualan/Barang/Uang/Sistem section headers, matching the "Rak & Rel v2"
 * design doc confirmed with the user 2026-08-22. Pure presentation layer —
 * role-based visibility is still decided by lib/auth/access.ts's
 * isAllowedPage(), unchanged; this file only decides grouping/icons/order.
 */
import type { NavIconName } from "@/components/layout/NavIcons";

export interface NavLeaf {
  href: string;
  label: string;
  icon: NavIconName;
  /** Which live count (see app/layout.tsx) this row's badge chip shows, if any. */
  badge?: "invoiceCount" | "lowStock";
}

export interface NavGroup {
  /** null = ungrouped (Beranda sits alone at the top, no section heading). */
  label: string | null;
  items: NavLeaf[];
}

export const NAV_GROUPS: NavGroup[] = [
  { label: null, items: [{ href: "/", label: "Beranda", icon: "home" }] },
  {
    label: "Jualan",
    items: [
      { href: "/penjualan", label: "Penjualan Baru", icon: "cart" },
      { href: "/katalog", label: "Katalog", icon: "grid" },
      { href: "/invoice", label: "Invoice", icon: "document", badge: "invoiceCount" },
      { href: "/pelanggan", label: "Pelanggan", icon: "users" },
    ],
  },
  {
    label: "Barang",
    items: [
      { href: "/produk", label: "Inventory", icon: "box", badge: "lowStock" },
      { href: "/produk/riwayat", label: "Riwayat Stok", icon: "list" },
      { href: "/purchasing", label: "Purchasing", icon: "truck" },
    ],
  },
  {
    label: "Uang",
    items: [
      { href: "/keuangan", label: "Keuangan", icon: "cashbox" },
      { href: "/akuntansi", label: "Akuntansi", icon: "ledger" },
      { href: "/insentif", label: "Leaderboard Sales", icon: "trophy" },
      { href: "/bayar-komisi", label: "Bayar Komisi", icon: "split" },
      { href: "/bayar-tagihan", label: "Bayar Tagihan", icon: "receipt" },
    ],
  },
  { label: "Sistem", items: [{ href: "/admin", label: "Admin", icon: "gear" }] },
];

// Display label for the header's group-tab strip — a bare item with no
// section heading (just Beranda today) falls back to its own label, so the
// strip still reads "Beranda" instead of blank.
const FLAT: { href: string; groupLabel: string }[] = NAV_GROUPS.flatMap((g) =>
  g.items.map((item) => ({ href: item.href, groupLabel: g.label ?? item.label }))
);

export interface ModuleMeta {
  groupLabel: string;
  index: number; // 1-based
  total: number;
}

/**
 * Resolves any pathname (not just exact nav hrefs — also detail/sub pages
 * like /produk/baru or /pelanggan/[id]) to its nav module via longest-prefix
 * match, so the page header's big number/group breadcrumb stays accurate
 * even on pages that aren't themselves a sidebar entry.
 */
export function getModuleMeta(pathname: string): ModuleMeta | null {
  let bestHref = "";
  let bestGroupLabel = "";
  let bestIndex = -1;
  for (let i = 0; i < FLAT.length; i++) {
    const entry = FLAT[i];
    const matches = pathname === entry.href || pathname.startsWith(`${entry.href}/`);
    if (matches && entry.href.length > bestHref.length) {
      bestHref = entry.href;
      bestGroupLabel = entry.groupLabel;
      bestIndex = i + 1;
    }
  }
  if (bestIndex === -1) return null;
  return { groupLabel: bestGroupLabel, index: bestIndex, total: FLAT.length };
}
