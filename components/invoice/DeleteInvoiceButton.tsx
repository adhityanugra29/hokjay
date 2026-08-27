"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDialog } from "@/components/ui/Dialog";

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
  const { confirm, alert } = useDialog();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    // "Stok yang sudah terpotong akan dikembalikan" dropped from this
    // message — since 2026-08-27 an unpaid invoice never deducts stock in
    // the first place (only a pre-2026-08-27 legacy-finalized one still
    // would), so the claim was no longer accurate for most invoices.
    const ok = await confirm(`Hapus invoice ${nomor}? Tindakan ini tidak bisa dibatalkan.`, { danger: true });
    if (!ok) return;
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
      await alert(err instanceof Error ? err.message : "Gagal menghapus invoice");
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
