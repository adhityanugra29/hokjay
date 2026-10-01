"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import InvoiceDocument from "./InvoiceDocument";
import InvoicePrintDoc from "./InvoicePrintDoc";
import { useInvoicePdfDownload } from "./useInvoicePdfDownload";
import type { InvoicePrintData } from "@/lib/invoiceDisplay";

const PRINT_DOC_ID = "payroll-invoice-print-doc";

/**
 * Invoice preview + "Unduh PDF" opened from an invoice number on Payroll's
 * Komisi and Riwayat drawers, so the owner can check the invoice behind a
 * commission figure without leaving the payment screen. Loads the same
 * InvoicePrintData the invoice pages use (GET /api/invoices/[id]/print),
 * shows InvoiceDocument, and downloads through the shared
 * useInvoicePdfDownload hook against a hidden InvoicePrintDoc.
 *
 * The hidden print doc is a sibling of the overlay, not a child of its flex
 * row — same reason as BUG-019 (an un-clipped 794px-wide child inside a
 * `justify-end` flex row shoves the visible panel sideways).
 */
export default function InvoicePdfModal({
  invoiceId,
  nomor,
  onClose,
}: {
  invoiceId: string;
  nomor: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<InvoicePrintData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { downloading, downloadInvoicePdf } = useInvoicePdfDownload();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/invoices/${invoiceId}/print`)
      .then(async (res) => {
        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          throw new Error(b.error || "Gagal memuat invoice");
        }
        return res.json() as Promise<InvoicePrintData>;
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Gagal memuat invoice");
      });
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div
        className="no-print fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-3 sm:p-6"
        onClick={onClose}
        role="presentation"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Invoice ${nomor}`}
          className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-panel shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 className="font-sans text-[0.95rem] font-extrabold">Invoice {nomor}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface text-base text-ink hover:bg-line"
            >
              ✕
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-surface p-3 sm:p-4">
            {data && <InvoiceDocument invoice={data} />}
            {!data && !error && <div className="py-16 text-center font-sans text-[0.85rem] text-muted">Memuat invoice...</div>}
            {error && <div className="py-16 text-center font-sans text-[0.85rem] text-danger">{error}</div>}
          </div>
          <div className="flex flex-wrap gap-2.5 border-t border-line px-4 py-3">
            <button
              type="button"
              onClick={() => downloadInvoicePdf(nomor, PRINT_DOC_ID)}
              disabled={!data || downloading}
              className="inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-full border border-accent bg-accent px-5 font-sans text-[0.85rem] font-extrabold text-ink transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloading ? "Menyiapkan PDF..." : "Unduh PDF"}
            </button>
            <Link
              href={`/invoice/${invoiceId}`}
              className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-line px-5 font-sans text-[0.85rem] font-bold text-ink no-underline hover:bg-surface"
            >
              Buka halaman invoice
            </Link>
          </div>
        </div>
      </div>
      {data && <InvoicePrintDoc key={invoiceId} invoice={data} id={PRINT_DOC_ID} />}
    </>
  );
}
