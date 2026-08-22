import type { UserRole } from "@/models/User";

// Pure, dependency-free (no next/headers, no server-only) so this can be
// imported by proxy.ts (edge runtime) AND client components (AppShell's
// nav filtering) without pulling in anything runtime-incompatible.

export const SALES_PREFIXES = ["/penjualan", "/katalog", "/invoice", "/produk", "/pelanggan"];
export const FINANCE_PREFIXES = ["/insentif", "/bayar-komisi", "/bayar-tagihan", "/keuangan", "/akuntansi"];
export const PURCHASING_PREFIXES = ["/purchasing"];

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

export function isAllowedPage(role: UserRole, pathname: string): boolean {
  if (role === "admin") return true;
  // Dashboard-adjacent content, viewable by every role just like "/" itself.
  if (pathname === "/" || pathname === "/follow-up" || pathname === "/aktivitas") return true;
  const prefixes = ROLE_PREFIXES[role] ?? [];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
