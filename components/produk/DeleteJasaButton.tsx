"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDialog } from "@/components/ui/Dialog";

/** Hapus button for a row in Inventory's Jasa tab — same pattern as DeleteProductButton. Per the user's request 2026-10-07. */
export default function DeleteJasaButton({ jasaId, jasaNama }: { jasaId: string; jasaNama: string }) {
  const router = useRouter();
  const { confirm, alert } = useDialog();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const ok = await confirm(`Hapus jasa "${jasaNama}"? Tindakan ini tidak bisa dibatalkan.`, { danger: true });
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/jasa/${jasaId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal menghapus jasa");
      }
      router.refresh();
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Gagal menghapus jasa");
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="cursor-pointer border-0 bg-transparent p-0 font-sans text-[0.8rem] font-bold text-danger underline disabled:cursor-not-allowed disabled:opacity-50"
    >
      {deleting ? "Menghapus..." : "Hapus"}
    </button>
  );
}
