import type { UserRole } from "@/models/User";

// Pure, dependency-free (no next/headers, no server-only) so this can be
// imported by proxy.ts (edge runtime) AND client components (AppShell's
// nav filtering) without pulling in anything runtime-incompatible.

// "/payroll" is Sales-reachable for their own read-only slip gaji only; the admin payment dashboard at the same URL is gated inside
// app/payroll pages (!isAdminLevel -> notFound()). "/insentif" is NOT listed: see INSENTIF_ALLOWED_ROLES (overrides these grants).
export const SALES_PREFIXES = ["/katalog", "/invoice", "/pelanggan", "/payroll"];
// Payroll is Admin-only, so Finance has no payroll-payment surface.
export const FINANCE_PREFIXES = ["/bayar-tagihan", "/keuangan", "/akuntansi"];
// Inventaris Kantor is its own module; Purchasing reaches it via "Catat sebagai Aset" on a paid Material Order.
export const PURCHASING_PREFIXES = ["/purchasing", "/inventaris-kantor"];

const ROLE_PREFIXES: Record<string, string[]> = {
  sales: SALES_PREFIXES,
  finance: FINANCE_PREFIXES,
  purchasing: PURCHASING_PREFIXES,
};

// Admin has full access (superuser); every other logged-in role can still
// call the rest of the API (the pages themselves already gate what's
// reachable in the UI). Two tiers of admin-only API restriction:

// Fully admin-only regardless of HTTP method — account listings/emails are
// sensitive, nobody else should even be able to GET them.
export const ADMIN_ONLY_ALL_METHODS_PREFIXES = ["/api/admin"];

// Admin-only for *writes* (POST/PUT/PATCH/DELETE) — but GET stays open to
// any logged-in role, since these are read broadly across the app (Katalog's
// category filter, InvoiceForm's kurir/metode-pembayaran pickers,
// Keuangan's account name lookups, CatalogPrintDoc's global fetch). Only
// creating/editing/deleting these settings is an Admin-only action.
export const ADMIN_ONLY_WRITE_PREFIXES = [
  "/api/categories",
  "/api/couriers",
  "/api/payment-methods",
  "/api/pengaturan",
];
// /api/suppliers is deliberately NOT admin-only-write like the settings
// above — suppliers get added ad-hoc by Purchasing as they source new
// vendors (not curated upfront by Admin like Category/Courier/Payment
// Method), so any logged-in role can create/edit them, same as
// /api/purchase-requests and /api/purchase-bills.

// owner, super_admin and manager have the same authority as admin (separate roles only so accounts are labeled distinctly).
// Use this instead of checking role === "admin" so every admin-level role stays in lockstep.
export function isAdminLevel(role: UserRole | undefined | null): boolean {
  return role === "admin" || role === "owner" || role === "super_admin" || role === "manager";
}

// manager is admin-level everywhere EXCEPT these: Akuntansi, Payroll (incl. Absensi/Karyawan) and Bayar Tagihan.
// API routes that must also refuse manager use isPayrollAdminLevel (below), so a raw request cannot reach what the page hides.
export const MANAGER_BLOCKED_PREFIXES = ["/akuntansi", "/payroll", "/bayar-tagihan"];

// Manager-blocked /admin sub-tabs: Sales roster, Keuangan, Akun Login (Owner/Super Admin only), Invoice (S&K settings).
// A separate list because "/admin" itself must stay allowed. Tab list: app/admin/layout.tsx.
export const MANAGER_BLOCKED_ADMIN_PREFIXES = ["/admin/user", "/admin/keuangan", "/admin/akun", "/admin/invoice"];

// Akun Login: Owner/Super Admin only, enforced at the API too (app/api/admin/users/**) — a raw PATCH could otherwise let a Manager
// grant themselves a higher role or reset passwords. Narrower than isAdminLevel (see proxy.ts).
export const AKUN_LOGIN_ROLES: UserRole[] = ["owner", "super_admin"];
export function isAkunLoginAllowed(role: UserRole | undefined | null): boolean {
  return !!role && AKUN_LOGIN_ROLES.includes(role);
}

// Insentif/Leaderboard: owner, super_admin, manager only — not even plain admin (this check runs before the admin bypass).
// Manager is a sales rep with extra authority, so they appear on the board too.
export const INSENTIF_ALLOWED_ROLES: UserRole[] = ["owner", "super_admin", "manager"];
export function isInsentifAllowed(role: UserRole | undefined | null): boolean {
  return !!role && INSENTIF_ALLOWED_ROLES.includes(role);
}

// "Komisi Saya": a rep's own commission summary (vs. the multi-sales /insentif). Only sales and manager have "own data".
// Same override-before-admin-bypass pattern as isInsentifAllowed.
export function isKomisiSayaAllowed(role: UserRole | undefined | null): boolean {
  return role === "sales" || role === "manager";
}

export function isAllowedPage(role: UserRole, pathname: string): boolean {
  if (pathname === "/insentif" || pathname.startsWith("/insentif/")) {
    return isInsentifAllowed(role);
  }
  if (pathname === "/komisi-saya" || pathname.startsWith("/komisi-saya/")) {
    return isKomisiSayaAllowed(role);
  }
  if (role === "manager") {
    if (MANAGER_BLOCKED_ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return false;
    return !MANAGER_BLOCKED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }
  if (isAdminLevel(role)) return true;
// Open to every role. "/menu" must be listed: the mobile tab bar links there for every role, and proxy.ts would silently bounce it
// to "/" (the page itself re-checks isAllowedPage per link).
  if (
    pathname === "/" ||
    pathname === "/follow-up" ||
    // every role; a plain "sales" is scoped to their own invoices by the data layer, not here
    pathname === "/pengiriman" ||
    pathname === "/aktivitas" ||
    pathname === "/akun-saya" ||
    pathname === "/menu"
  )
    return true;
  const prefixes = ROLE_PREFIXES[role] ?? [];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** isAdminLevel, but false for "manager" — for the handful of API routes that are specifically Payroll's own domain (absensi, karyawan, gaji payout) so Manager can't reach them via a raw request either, not just the page. */
export function isPayrollAdminLevel(role: UserRole | undefined | null): boolean {
  return isAdminLevel(role) && role !== "manager";
}

// Commission settings (a product's Komisi Bekas override + hidden Komisi %, a category's default Komisi Bekas): Owner ONLY, not even
// Super Admin — deliberately narrower than the ["owner","super_admin"] used by Flash Sale/Akun Login. One list so call sites cannot drift.
export const KOMISI_SETTING_ROLES: UserRole[] = ["owner"];
export function isKomisiSettingAllowed(role: UserRole | undefined | null): boolean {
  return !!role && KOMISI_SETTING_ROLES.includes(role);
}

// Deleting a product — Owner only, on every surface that shows the delete button (Katalog and Inventory).
export const PRODUCT_DELETE_ROLES: UserRole[] = ["owner"];
export function isProductDeleteAllowed(role: UserRole | undefined | null): boolean {
  return !!role && PRODUCT_DELETE_ROLES.includes(role);
}
