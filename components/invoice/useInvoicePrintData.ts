"use client";

import { useEffect, useState } from "react";
import type { InvoicePrintData } from "@/lib/invoiceDisplay";

/**
 * Loads InvoicePrintData for one invoice (GET /api/invoices/[id]/print) —
 * shared by the list's Preview drawer and Payroll's InvoicePdfModal. Returns
 * null until the current `invoiceId` has resolved (so switching invoices
 * never shows the previous one's data), then `{ data }` or `{ error }`.
 */
export function useInvoicePrintData(invoiceId: string | null) {
  const [result, setResult] = useState<{ id: string; data?: InvoicePrintData; error?: string } | null>(null);

  useEffect(() => {
    if (!invoiceId) return;
    let cancelled = false;
    fetch(`/api/invoices/${invoiceId}/print`)
      .then(async (res) => {
        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          throw new Error(b.error || "Gagal memuat invoice");
        }
        return res.json() as Promise<InvoicePrintData>;
      })
      .then((data) => {
        if (!cancelled) setResult({ id: invoiceId, data });
      })
      .catch((err) => {
        if (!cancelled) setResult({ id: invoiceId, error: err instanceof Error ? err.message : "Gagal memuat invoice" });
      });
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  return result?.id === invoiceId ? result : null;
}
