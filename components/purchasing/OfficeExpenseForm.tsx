"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input, Select, Textarea } from "@/components/ui/Form";
import { Button, LinkButton } from "@/components/ui/Button";

const KATEGORI_OPTIONS: { value: string; label: string }[] = [
  { value: "listrik", label: "Listrik" },
  { value: "internet", label: "Internet / WiFi" },
  { value: "pulsa", label: "Pulsa" },
  { value: "lainnya", label: "Lainnya" },
];

/** Kebutuhan Kantor — office operational expense request. Ajukan di sini, lalu menunggu approval Admin sebelum bisa ditransfer. */
export default function OfficeExpenseForm() {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [kategori, setKategori] = useState("listrik");
  const [jumlah, setJumlah] = useState("");
  const [alasan, setAlasan] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nama.trim()) return setError("Nama kebutuhan wajib diisi.");
    if ((Number(jumlah) || 0) <= 0) return setError("Jumlah harus lebih dari 0.");

    setSaving(true);
    try {
      const res = await fetch("/api/office-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, kategori, jumlah: Number(jumlah) || 0, alasan: alasan || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal mengirim request");
      }
      router.push("/purchasing/job-order");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim request");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel className="max-w-2xl p-7">
      <form onSubmit={handleSubmit}>
        <FormGrid>
          <Field label="Nama Kebutuhan" span2>
            <Input
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Bayar tagihan listrik Agustus"
            />
          </Field>
          <Field label="Kategori">
            <Select value={kategori} onChange={(e) => setKategori(e.target.value)}>
              {KATEGORI_OPTIONS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Jumlah (Rp)">
            <Input required type="number" min={1} value={jumlah} onChange={(e) => setJumlah(e.target.value)} />
          </Field>
          <Field label="Alasan / Catatan (opsional)" span2>
            <Textarea rows={2} value={alasan} onChange={(e) => setAlasan(e.target.value)} />
          </Field>
        </FormGrid>

        {error && <div className="mt-3 font-mono text-[0.75rem] text-danger">{error}</div>}

        <FormActions>
          <Button type="submit" disabled={saving}>
            {saving ? "Mengirim..." : "Kirim Request"}
          </Button>
          <LinkButton variant="ghost" href="/purchasing/job-order">
            Batal
          </LinkButton>
        </FormActions>
      </form>
    </Panel>
  );
}
