import type { UserRole } from "@/models/User";

// Pure, dependency-free (no next/headers, no server-only) so this can be
// imported by proxy.ts (edge runtime) AND client components (AppShell's
// nav filtering) without pulling in anything runtime-incompatible.

export const SALES_PREFIXES = ["/penjualan", "/katalog", "/invoice", "/produk", "/pelanggan"];
export const FINANCE_PREFIXES = ["/insentif", "/bayar-komisi", "/keuangan", "/akuntansi"];

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

export function isAllowedPage(role: UserRole, pathname: string): boolean {
  if (role === "admin") return true;
  // Dashboard-adjacent content, viewable by every role just like "/" itself.
  if (pathname === "/" || pathname === "/follow-up") return true;
  const prefixes = role === "sales" ? SALES_PREFIXES : FINANCE_PREFIXES;
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
