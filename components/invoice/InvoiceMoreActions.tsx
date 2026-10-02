"use client";

import { useState } from "react";

/**
 * "Aksi lainnya" disclosure for the invoice detail page's main card — per
 * the approved mockup (docs/SDD/mockups/invoice-detail-v7.html, TASK-039).
 * Opens inline (not a floating dropdown). While closed it shows a one-line
 * peek of what's inside so people know what to expect. The menu rows
 * themselves are composed by the server page and passed as children, so
 * the visibility rules (Ubah/Hapus/Catat DP) stay next to the data.
 */
export default function InvoiceMoreActions({ peek, children }: { peek: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-5.5 border-t border-line pt-5.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between border-0 bg-transparent p-0 font-sans text-[0.85rem] font-extrabold text-ink hover:text-accent-700"
      >
        <span>Aksi lainnya</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`h-4 w-4 ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div className="-mx-6 mt-2.5 flex flex-col">{children}</div>
      ) : (
        <div className="mt-1.5 font-sans text-[0.72rem] leading-normal text-muted">{peek}</div>
      )}
    </div>
  );
}
