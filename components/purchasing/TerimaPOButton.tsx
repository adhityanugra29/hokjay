"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function TerimaPOButton({ poId }: { poId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!confirm("Tandai PO ini sebagai diterima? Stok akan bertambah dan Material Order otomatis dibuat.")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/purchase-orders/${poId}/terima`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal menandai PO diterima");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menandai PO diterima");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Button onClick={handleClick} disabled={saving}>
        {saving ? "Memproses..." : "Tandai Diterima"}
      </Button>
      {error && <div className="mt-2 font-mono text-[0.75rem] text-danger">{error}</div>}
    </div>
  );
}
