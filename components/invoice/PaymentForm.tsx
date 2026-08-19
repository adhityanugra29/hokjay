"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input, Select, Textarea } from "@/components/ui/Form";
import { Button, LinkButton } from "@/components/ui/Button";
import UploadBox from "@/components/ui/UploadBox";
import { rupiah } from "@/lib/format";

interface CourierOption {
  _id: string;
  name: string;
}

export default function PaymentForm({
  invoiceId,
  nomor,
  customerNama,
  salesNama,
  grandTotal,
  paymentMethods,
  couriers,
}: {
  invoiceId: string;
  nomor: string;
  customerNama: string;
  salesNama: string;
  grandTotal: number;
  paymentMethods: string[];
  couriers: CourierOption[];
}) {
  const router = useRouter();
  const [metode, setMetode] = useState<string>(paymentMethods[0] ?? "");
  const [nominal, setNominal] = useState(String(grandTotal));
  const [buktiUrl, setBuktiUrl] = useState("");
  const [tanggalKirim, setTanggalKirim] = useState("");
  const [kurirId, setKurirId] = useState("");
  const [noResi, setNoResi] = useState("");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metode,
          nominalDiterima: Number(nominal),
          buktiUrl: buktiUrl || undefined,
          tanggalKirim: tanggalKirim || undefined,
          kurir: kurirId ? couriers.find((c) => c._id === kurirId)?.name : undefined,
          noResi: noResi || undefined,
          catatan: catatan || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal mengonfirmasi pembayaran");
      }
      router.push(`/invoice/${invoiceId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengonfirmasi pembayaran");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
      <Panel className="p-7">
        <form onSubmit={handleSubmit}>
          <FormGrid>
            <Field label="Bukti Transfer" span2>
              <UploadBox folder="payments" value={buktiUrl} onChange={setBuktiUrl} />
            </Field>
            <Field label="Metode Pembayaran">
              <Select value={metode} onChange={(e) => setMetode(e.target.value)}>
                {paymentMethods.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </Field>
            <Field label="Nominal Diterima">
              <Input type="number" value={nominal} onChange={(e) => setNominal(e.target.value)} />
            </Field>
            <Field label="Tanggal Pengiriman Barang">
              <Input type="date" value={tanggalKirim} onChange={(e) => setTanggalKirim(e.target.value)} />
            </Field>
            <Field label="Kurir / Pengiriman">
              <Select value={kurirId} onChange={(e) => setKurirId(e.target.value)}>
                <option value="">— Pilih kurir —</option>
                {couriers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="No. Resi (opsional)">
              <Input value={noResi} onChange={(e) => setNoResi(e.target.value)} placeholder="Contoh: JNE-8827301" />
            </Field>
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
            <Button variant="clay" type="submit" disabled={saving}>
              {saving ? "Memproses..." : "Konfirmasi & Tandai Lunas"}
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
            Sales: {salesNama}
            <br />
            Total: <span className="font-semibold text-ink">{rupiah(grandTotal)}</span>
          </div>
        </div>
        <div className="border border-line bg-panel p-5">
          <h3 className="mb-3 font-mono text-[0.7rem] uppercase tracking-wide text-muted">
            Apa yang terjadi setelah konfirmasi
          </h3>
          <div className="font-mono text-[0.75rem] leading-relaxed text-muted">
            • Status invoice → Lunas
            <br />
            • Bukti transfer tersimpan sebagai riwayat
            <br />• Arus kas "Uang Masuk" tercatat otomatis
          </div>
        </div>
      </div>
    </div>
  );
}
