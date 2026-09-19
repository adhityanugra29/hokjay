"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDialog } from "@/components/ui/Dialog";

/**
 * Marks an invoice as physically shipped — independent of payment status
 * (draft is the only status this isn't offered for). Posts to
 * /api/invoices/[id]/kirim; once marked, the invoice drops out of
 * Beranda's "Perlu Dikirim" widget and /follow-up?view=kirim (see
 * lib/dashboard.ts's getShippingPriorityInvoices). Per the user's request
 * 2026-09-19 ("Tandai Sudah Kirim... buat triggernya").
 */
export default function TandaiKirimButton({
  invoiceId,
  nomor,
  className,
}: {
  invoiceId: string;
  nomor: string;
  className?: string;
}) {
  const router = useRouter();
  const { confirm, alert } = useDialog();
  const [saving, setSaving] = useState(false);

  async function handleClick() {
    const ok = await confirm(`Tandai invoice ${nomor} sudah dikirim?`);
    if (!ok) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/kirim`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dikirim: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal menandai invoice sudah dikirim");
      }
      router.refresh();
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Gagal menandai invoice sudah dikirim");
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={saving}
      className={
        className ??
        "cursor-pointer border border-ink bg-ink px-3 py-1.5 font-sans text-[0.72rem] font-semibold text-accent no-underline hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {saving ? "Menandai..." : "Tandai Sudah Kirim"}
    </button>
  );
}
