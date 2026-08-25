import type { UserRole } from "@/models/User";

// Pure, dependency-free (no next/headers, no server-only) so this can be
// imported by proxy.ts (edge runtime) AND client components (AppShell's
// nav filtering) without pulling in anything runtime-incompatible.

// "/payroll" is Sales-reachable — but only for their own read-only slip
// gaji; the admin payment dashboard living at the same URL is gated inside
// app/payroll/**\/page.tsx itself (!isAdminLevel(session.role) -> notFound()).
// See models/Karyawan.ts, models/Absensi.ts, models/GajiPayment.ts.
export const SALES_PREFIXES = ["/katalog", "/invoice", "/produk", "/pelanggan", "/payroll"];
// Payroll (2026-08-23) folded in the old Bayar Komisi and moved to
// Admin-only per the user's explicit confirmation — Finance no longer has
// a payroll-payment surface at all (was "/bayar-komisi" here before).
export const FINANCE_PREFIXES = ["/insentif", "/bayar-tagihan", "/keuangan", "/akuntansi"];
// Inventaris Kantor is its own module (split out from Purchasing 2026-08-23)
// but Purchasing still needs to reach it — the "Catat sebagai Aset" link
// from a paid Material Order lands here.
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

// "owner", "super_admin", "manager" (owner added 2026-08-25 as "Owner
// Hojay"; super_admin/manager added the same day as "Super Admin"/"Manager
// Hojay") all have the exact same authority as "admin" everywhere in the
// app — separate roles purely so each account is labeled distinctly, not
// restricted ones. Every place that used to check `role === "admin"` should
// use this instead, so all of them stay in lockstep by construction rather
// than needing every admin-level role name repeated at each call site.
export function isAdminLevel(role: UserRole | undefined | null): boolean {
  return role === "admin" || role === "owner" || role === "super_admin" || role === "manager";
}

export function isAllowedPage(role: UserRole, pathname: string): boolean {
  if (isAdminLevel(role)) return true;
  // Dashboard-adjacent content, viewable by every role just like "/" itself.
  if (pathname === "/" || pathname === "/follow-up" || pathname === "/aktivitas") return true;
  const prefixes = ROLE_PREFIXES[role] ?? [];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
