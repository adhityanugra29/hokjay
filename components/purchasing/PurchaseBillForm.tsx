"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input, Select, Textarea } from "@/components/ui/Form";
import { Button, LinkButton } from "@/components/ui/Button";
import UploadBox from "@/components/ui/UploadBox";
import { rupiah } from "@/lib/format";

interface FromRequest {
  _id: string;
  nomor: string;
  namaBarang: string;
  qty: number;
}

interface SupplierOption {
  _id: string;
  namaUsaha: string;
  bank: string;
  nomorRekening: string;
}

/** Purchasing fills this in once they've sourced a supplier and know the cost — see app/api/purchase-bills/route.ts. */
export default function PurchaseBillForm({
  fromRequest,
  suppliers,
}: {
  fromRequest?: FromRequest;
  suppliers: SupplierOption[];
}) {
  const router = useRouter();
  const [namaBarang, setNamaBarang] = useState(fromRequest?.namaBarang ?? "");
  const [qty, setQty] = useState(String(fromRequest?.qty ?? 1));
  const [supplierId, setSupplierId] = useState("");
  const [hargaSatuan, setHargaSatuan] = useState("0");
  const [jatuhTempo, setJatuhTempo] = useState("");
  const [buktiTagihanUrl, setBuktiTagihanUrl] = useState("");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => (Number(qty) || 0) * (Number(hargaSatuan) || 0), [qty, hargaSatuan]);
  const selectedSupplier = suppliers.find((s) => s._id === supplierId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!namaBarang.trim()) return setError("Nama barang wajib diisi.");
    if (!supplierId) return setError("Pilih supplier.");
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
          supplierId,
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
          <Field
            label="Supplier"
            hint={
              <>
                Belum ada di daftar?{" "}
                <Link href="/purchasing/supplier" className="text-accent underline">
                  Tambah supplier baru
                </Link>
              </>
            }
          >
            <Select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">— Pilih supplier —</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.namaUsaha}
                </option>
              ))}
            </Select>
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

        {selectedSupplier && (
          <div className="mt-5 border border-line bg-[#f7f5ee] p-4 font-mono text-[0.75rem]">
            Transfer ke: <span className="font-semibold text-ink">{selectedSupplier.bank}</span> —{" "}
            <span className="font-semibold text-ink">{selectedSupplier.nomorRekening}</span>
          </div>
        )}

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
