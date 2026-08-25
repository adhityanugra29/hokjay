"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Delete button for a draft/unpaid invoice — only rendered by callers when
 * status !== "paid" (see lib/services/deleteInvoice.ts for the server-side
 * guard too). Warns before deleting per the user's request 2026-08-25.
 */
export default function DeleteInvoiceButton({
  invoiceId,
  nomor,
  redirectTo,
  className,
}: {
  invoiceId: string;
  nomor: string;
  /** Where to navigate after a successful delete — omit to just router.refresh() in place (list rows). */
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        `Hapus invoice ${nomor}? Stok yang sudah terpotong akan dikembalikan. Tindakan ini tidak bisa dibatalkan.`
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal menghapus invoice");
      }
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus invoice");
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className={
        className ??
        "cursor-pointer border border-line px-3 py-1.5 font-sans text-[0.72rem] font-semibold text-danger no-underline hover:border-danger disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {deleting ? "Menghapus..." : "Hapus"}
    </button>
  );
}
