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
  badge?: "invoiceCount" | "produkBaru";
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
      // "Penjualan Baru" (a separate "pick customer first" page at
      // /penjualan) was merged into this row per the user's request
      // 2026-08-25 — Katalog is now the direct start of the sales flow,
      // customer picking happens at invoice time instead (InvoiceForm's
      // own inline picker).
      { href: "/katalog", label: "Katalog", icon: "cart" },
      { href: "/invoice", label: "Invoice", icon: "document", badge: "invoiceCount" },
      { href: "/pelanggan", label: "Pelanggan", icon: "users" },
      // Moved from "Uang" into "Jualan" per the user's request 2026-08-23.
      { href: "/insentif", label: "Leaderboard Sales", icon: "trophy" },
    ],
  },
  {
    label: "Barang",
    items: [
      // Riwayat Stok isn't its own nav row — redundant with Inventory,
      // which already surfaces it as a tab (app/produk/(list)/layout.tsx).
      // Removed per the user's request 2026-08-22.
      { href: "/produk", label: "Inventory", icon: "box", badge: "produkBaru" },
      { href: "/purchasing", label: "Purchasing", icon: "truck" },
      // Split out from Purchasing into its own module per the user's
      // request 2026-08-23 — it's asset tracking, not procurement.
      { href: "/inventaris-kantor", label: "Inventaris Kantor", icon: "list" },
    ],
  },
  {
    label: "Uang",
    items: [
      { href: "/keuangan", label: "Keuangan", icon: "cashbox" },
      { href: "/akuntansi", label: "Akuntansi", icon: "ledger" },
      // "Payroll" (2026-08-23) — merges the old standalone Bayar Komisi with
      // gaji pokok (sales tetap) + gaji karyawan (non-sales, absensi-based)
      // into one nav entry. Same URL for Admin (full payment dashboard) and
      // Sales (their own read-only slip) — see app/payroll/page.tsx.
      { href: "/payroll", label: "Payroll", icon: "split" },
      { href: "/bayar-tagihan", label: "Bayar Tagihan", icon: "receipt" },
      // Sales-only own-commission view (2026-08-26) — isAllowedPage gates
      // this to role "sales" specifically (see isKomisiSayaAllowed), so it
      // never shows up for anyone else even though they see this same group.
      // Moved here from "Jualan" per the user's request 2026-08-26 — it's
      // about money, belongs with Keuangan/Payroll, not the selling flow.
      { href: "/komisi-saya", label: "Komisi Saya", icon: "trophy" },
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
}

/**
 * Resolves any pathname (not just exact nav hrefs — also detail/sub pages
 * like /produk/baru or /pelanggan/[id]) to its nav group via longest-prefix
 * match, so the page header's group breadcrumb stays accurate even on
 * pages that aren't themselves a sidebar entry. No numbering (module
 * index/total) — removed per the user's request 2026-08-23.
 */
export function getModuleMeta(pathname: string): ModuleMeta | null {
  let bestHref = "";
  let bestGroupLabel = "";
  for (const entry of FLAT) {
    const matches = pathname === entry.href || pathname.startsWith(`${entry.href}/`);
    if (matches && entry.href.length > bestHref.length) {
      bestHref = entry.href;
      bestGroupLabel = entry.groupLabel;
    }
  }
  if (!bestHref) return null;
  return { groupLabel: bestGroupLabel };
}
