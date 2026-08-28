"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDialog } from "@/components/ui/Dialog";

const cls =
  "cursor-pointer border border-line px-3 py-1.5 font-sans text-[0.72rem] font-semibold leading-tight text-danger no-underline transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Delete button for the Pelanggan detail page — mirrors
 * DeleteProductButton.tsx's shape/guard-free behavior (no check against
 * existing invoices, confirmed with the user 2026-08-28; an invoice keeps
 * its own snapshotted customer.nama/whatsapp regardless, so it still
 * displays fine — only the customer.ref link goes dangling).
 */
export default function DeleteCustomerButton({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string;
}) {
  const router = useRouter();
  const { confirm, alert } = useDialog();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const ok = await confirm(`Hapus pelanggan "${customerName}"? Tindakan ini tidak bisa dibatalkan.`, {
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal menghapus pelanggan");
      }
      router.push("/pelanggan");
      router.refresh();
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Gagal menghapus pelanggan");
      setDeleting(false);
    }
  }

  return (
    <button type="button" onClick={handleDelete} disabled={deleting} className={cls}>
      {deleting ? "Menghapus..." : "Hapus"}
    </button>
  );
}
