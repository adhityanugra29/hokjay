"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input, Textarea } from "@/components/ui/Form";
import { Button, LinkButton } from "@/components/ui/Button";
import UploadBox from "@/components/ui/UploadBox";
import { rupiah } from "@/lib/format";

export default function TagihanPaymentForm({ billId, total }: { billId: string; total: number }) {
  const router = useRouter();
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [buktiUrl, setBuktiUrl] = useState("");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/purchase-bills/${billId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tanggal, buktiUrl: buktiUrl || undefined, catatan: catatan || undefined }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || "Gagal memproses pembayaran tagihan");
      }
      router.push("/bayar-tagihan");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses pembayaran tagihan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Panel className="max-w-2xl p-7">
        <div className="mb-5 border border-line bg-[#f7f5ee] p-5">
          <div className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">Total tagihan</div>
          <div className="mt-1 text-[1.6rem] font-extrabold text-accent-700">{rupiah(total)}</div>
        </div>

        <FormGrid>
          <Field label="Tanggal Pembayaran">
            <Input required type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </Field>
          <Field label="Bukti Transfer (opsional)" span2>
            <UploadBox folder="purchasing" value={buktiUrl} onChange={setBuktiUrl} />
          </Field>
          <Field label="Catatan (opsional)" span2>
            <Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Contoh: transfer BCA a.n. ..." />
          </Field>
        </FormGrid>

        {error && <div className="mt-3 font-mono text-[0.75rem] text-danger">{error}</div>}

        <FormActions>
          <Button type="submit" disabled={saving}>
            {saving ? "Memproses..." : `Bayar Tagihan (${rupiah(total)})`}
          </Button>
          <LinkButton variant="ghost" href="/bayar-tagihan">
            Batal
          </LinkButton>
        </FormActions>
      </Panel>
    </form>
  );
}
