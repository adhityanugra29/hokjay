"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDialog } from "@/components/ui/Dialog";

const cls =
  "inline-block cursor-pointer border border-accent bg-panel px-3 py-1.5 font-sans text-[0.7rem] font-semibold leading-tight text-accent no-underline transition hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-50";

/** Delete button for a row in Inventory's product table — server-rendered list, so this is its own small client component rather than reusing RowActionButton's parent state. */
export default function DeleteProductButton({ productId, productName }: { productId: string; productName: string }) {
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
