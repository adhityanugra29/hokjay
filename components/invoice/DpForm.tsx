"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input, Select, Textarea } from "@/components/ui/Form";
import { Button, LinkButton } from "@/components/ui/Button";
import UploadBox from "@/components/ui/UploadBox";
import { rupiah } from "@/lib/format";

/**
 * Records a one-time DP on an already-finalized invoice — mirrors
 * PaymentForm.tsx's shape, but posts to /api/invoices/[id]/dp instead and
 * doesn't touch status/shipping (that's still Tandai Lunas's job). See
 * lib/services/receiveDp.ts. Confirmed with the user 2026-08-25.
 */
export default function DpForm({
  invoiceId,
  nomor,
  customerNama,
  grandTotal,
  paymentMethods,
}: {
  invoiceId: string;
  nomor: string;
  customerNama: string;
  grandTotal: number;
  paymentMethods: string[];
}) {
  const router = useRouter();
  // Defaults to whichever configured method reads as "Transfer" (e.g.
  // "Transfer Bank") — per the user's request 2026-08-25 — falling back to
  // the first configured method if none matches.
  const [metode, setMetode] = useState<string>(
    paymentMethods.find((m) => /transfer/i.test(m)) ?? paymentMethods[0] ?? ""
  );
  const [nominal, setNominal] = useState("");
  const [buktiUrl, setBuktiUrl] = useState("");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nominalNum = Number(nominal) || 0;
  const sisaSetelahDp = grandTotal - nominalNum;
  // Cash/Tunai never has a transfer receipt — hide the upload field
  // entirely. Per the user's request 2026-08-25.
  const isCash = /tunai|cash/i.test(metode);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/dp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metode, nominal: nominalNum, buktiUrl: buktiUrl || undefined, catatan: catatan || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal mencatat DP");
      }
      router.push(`/invoice/${invoiceId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mencatat DP");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
      <Panel className="p-7">
        <form onSubmit={handleSubmit}>
          <FormGrid>
            <Field label="Nominal DP">
              <Input
                required
                type="number"
                min={1}
                max={grandTotal - 1}
                value={nominal}
                onChange={(e) => setNominal(e.target.value)}
                placeholder="Rp 0"
              />
            </Field>
            <Field label="Metode Pembayaran">
              <Select
                value={metode}
                onChange={(e) => {
                  setMetode(e.target.value);
                  if (/tunai|cash/i.test(e.target.value)) setBuktiUrl("");
                }}
              >
                {paymentMethods.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </Field>
            {!isCash && (
              <Field label="Bukti Transfer" span2>
                <UploadBox folder="payments" value={buktiUrl} onChange={setBuktiUrl} />
              </Field>
            )}
            <Field label="Catatan (opsional)" span2>
              <Textarea
                rows={2}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: transfer dari rekening BCA a.n. Budi Santoso"
              />
            </Field>
          </FormGrid>

          {error && <div className="mt-3 font-mono text-[0.75rem] text-danger">{error}</div>}

          <FormActions>
            <Button variant="clay" type="submit" disabled={saving || nominalNum <= 0 || nominalNum >= grandTotal}>
              {saving ? "Memproses..." : "Catat DP"}
            </Button>
            <LinkButton variant="ghost" href={`/invoice/${invoiceId}`}>
              Batal
            </LinkButton>
          </FormActions>
        </form>
      </Panel>

      <div>
        <div className="mb-3.5 border border-line bg-panel p-5">
          <h3 className="mb-3 font-mono text-[0.7rem] uppercase tracking-wide text-muted">Ringkasan Invoice</h3>
          <div className="font-mono text-[0.8rem] leading-loose text-muted">
            No. Invoice: {nomor}
            <br />
            Pelanggan: {customerNama}
            <br />
            Total: <span className="font-semibold text-ink">{rupiah(grandTotal)}</span>
          </div>
        </div>
        <div className="mb-3.5 border border-line bg-panel p-5">
          <h3 className="mb-3 font-mono text-[0.7rem] uppercase tracking-wide text-muted">Sisa Setelah DP</h3>
          <div className="font-sans text-[1.3rem] font-extrabold">{rupiah(Math.max(0, sisaSetelahDp))}</div>
        </div>
        <div className="border border-line bg-panel p-5">
          <h3 className="mb-3 font-mono text-[0.7rem] uppercase tracking-wide text-muted">
            Apa yang terjadi setelah dicatat
          </h3>
          <div className="font-mono text-[0.75rem] leading-relaxed text-muted">
            • Status invoice tetap Belum Bayar — DP bukan pelunasan
            <br />
            • Arus kas "Uang Masuk" tercatat otomatis sebesar DP
            <br />• Sisa tagihan berkurang, dilunasi lewat Tandai Lunas nanti
          </div>
        </div>
      </div>
    </div>
  );
}
