"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input, Textarea } from "@/components/ui/Form";
import { Button, LinkButton } from "@/components/ui/Button";
import UploadBox from "@/components/ui/UploadBox";
import { rupiah } from "@/lib/format";

interface FromRequest {
  _id: string;
  nomor: string;
  namaBarang: string;
  qty: number;
}

/** Purchasing fills this in once they've sourced a supplier and know the cost — see app/api/purchase-bills/route.ts. */
export default function PurchaseBillForm({ fromRequest }: { fromRequest?: FromRequest }) {
  const router = useRouter();
  const [namaBarang, setNamaBarang] = useState(fromRequest?.namaBarang ?? "");
  const [qty, setQty] = useState(String(fromRequest?.qty ?? 1));
  const [supplier, setSupplier] = useState("");
  const [hargaSatuan, setHargaSatuan] = useState("0");
  const [jatuhTempo, setJatuhTempo] = useState("");
  const [buktiTagihanUrl, setBuktiTagihanUrl] = useState("");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => (Number(qty) || 0) * (Number(hargaSatuan) || 0), [qty, hargaSatuan]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!namaBarang.trim()) return setError("Nama barang wajib diisi.");
    if (!supplier.trim()) return setError("Supplier wajib diisi.");
    if ((Number(hargaSatuan) || 0) <= 0) return setError("Harga satuan harus lebih dari 0.");

    setSaving(true);
    try {
      const res = await fetch("/api/purchase-bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: fromRequest?._id,
          namaBarang,
          qty: Number(qty) || 1,
          supplier,
          hargaSatuan: Number(hargaSatuan) || 0,
          jatuhTempo: jatuhTempo || undefined,
          buktiTagihanUrl: buktiTagihanUrl || undefined,
          catatan: catatan || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal membuat tagihan pembelian");
      }
      router.push("/purchasing/tagihan");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat tagihan pembelian");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel className="max-w-2xl p-7">
      <form onSubmit={handleSubmit}>
        {fromRequest && (
          <div className="mb-5 border border-line bg-[#f7f5ee] p-4 font-mono text-[0.75rem] text-muted">
            Dari request <span className="font-semibold text-ink">{fromRequest.nomor}</span> — menandai request ini
            sebagai &quot;Dibeli&quot; setelah tagihan disimpan.
          </div>
        )}

        <FormGrid>
          <Field label="Nama Barang" span2>
            <Input required value={namaBarang} onChange={(e) => setNamaBarang(e.target.value)} />
          </Field>
          <Field label="Supplier">
            <Input required value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Nama toko/supplier" />
          </Field>
          <Field label="Qty">
            <Input required type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <Field label="Harga Satuan">
            <Input required type="number" min={0} value={hargaSatuan} onChange={(e) => setHargaSatuan(e.target.value)} />
          </Field>
          <Field label="Jatuh Tempo (opsional)">
            <Input type="date" value={jatuhTempo} onChange={(e) => setJatuhTempo(e.target.value)} />
          </Field>
          <Field label="Bukti Nota/Invoice Supplier (opsional)" span2>
            <UploadBox folder="purchasing" value={buktiTagihanUrl} onChange={setBuktiTagihanUrl} />
          </Field>
          <Field label="Catatan (opsional)" span2>
            <Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          </Field>
        </FormGrid>

        <div className="mt-5 border border-line bg-[#f7f5ee] p-5">
          <div className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">Total Tagihan</div>
          <div className="mt-1 text-[1.6rem] font-extrabold text-accent-700">{rupiah(total)}</div>
        </div>

        {error && <div className="mt-3 font-mono text-[0.75rem] text-danger">{error}</div>}

        <FormActions>
          <Button type="submit" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Tagihan"}
          </Button>
          <LinkButton variant="ghost" href="/purchasing">
            Batal
          </LinkButton>
        </FormActions>
      </form>
    </Panel>
  );
}
