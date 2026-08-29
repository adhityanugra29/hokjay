import type { SessionPayload } from "@/lib/auth/jwt";

/**
 * Per-sales invoice privacy — per the user's request 2026-08-29 ("sesama
 * sales tidak boleh untuk melihat invoice ... mereka tidak sharing
 * database"). Mirrors lib/pelanggan.ts's customerVisibilityFilter exactly:
 * a plain "sales" role only sees invoices whose sales.nama matches their
 * own; every other role (including "manager" — "mereka sales juga, tapi
 * diberikan otoritas lebih" doesn't extend to this restriction either)
 * sees everyone's, unfiltered.
 *
 * Unlike Customer.assignedSales, Invoice.sales.nama is a required field
 * (every invoice always has one) — so there's no "no owner, visible to
 * everyone" exception to carry over here.
 */
export function invoiceVisibilityFilter(session: SessionPayload | null | undefined): Record<string, unknown> {
  if (session?.role !== "sales") return {};
  return { "sales.nama": session.nama };
}

/** Page/route guard form of the same rule — see invoiceVisibilityFilter. */
export function isInvoiceBlockedForSession(
  session: SessionPayload | null | undefined,
  invoiceSalesNama: string | null | undefined
): boolean {
  return session?.role === "sales" && invoiceSalesNama !== session.nama;
}
