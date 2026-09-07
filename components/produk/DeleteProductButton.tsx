"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDialog } from "@/components/ui/Dialog";

const cls =
  "inline-block cursor-pointer border border-accent bg-panel px-3 py-1.5 font-sans text-[0.7rem] font-semibold leading-tight text-accent-700 no-underline transition hover:bg-accent hover:text-ink disabled:cursor-not-allowed disabled:opacity-50";

/** Delete button for a row in Inventory's product table — server-rendered list, so this is its own small client component rather than reusing RowActionButton's parent state. */
export default function DeleteProductButton({
  productId,
  productName,
  onDeleted,
}: {
  productId: string;
  productName: string;
  /** Called right after a successful delete, alongside router.refresh() — Katalog's EditProductDrawer.tsx (2026-09-07) uses this to close itself, since the product it was editing no longer exists. Existing callers (a plain list row, where a refresh alone is enough) leave this unset. */
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const { confirm, alert } = useDialog();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const ok = await confirm(`Hapus produk "${productName}"? Tindakan ini tidak bisa dibatalkan.`, { danger: true });
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal menghapus produk");
      }
      router.refresh();
      onDeleted?.();
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Gagal menghapus produk");
      setDeleting(false);
    }
  }

  return (
    <button type="button" onClick={handleDelete} disabled={deleting} className={cls}>
      {deleting ? "Menghapus..." : "Hapus"}
    </button>
  );
}
