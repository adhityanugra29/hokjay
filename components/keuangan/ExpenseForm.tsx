"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input, Select } from "@/components/ui/Form";
import { Button, LinkButton } from "@/components/ui/Button";
import { CASHFLOW_CATEGORIES } from "@/lib/constants";

export default function ExpenseForm() {
  const router = useRouter();
  const [keterangan, setKeterangan] = useState("");
  const [kategori, setKategori] = useState<string>("Pembelian Stok");
  const [referensi, setReferensi] = useState("");
  const [nominal, setNominal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/cashflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keterangan, kategori, referensi: referensi || undefined, nominal: Number(nominal) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal mencatat pengeluaran");
      }
      router.push("/keuangan");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mencatat pengeluaran");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel className="max-w-xl p-7">
      <form onSubmit={handleSubmit}>
        <FormGrid className="sm:grid-cols-1">
          <Field label="Keterangan">
            <Input
              required
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Pembelian stok — Kompor Gas Industrial"
            />
          </Field>
          <Field label="Kategori">
            <Select value={kategori} onChange={(e) => setKategori(e.target.value)}>
              {CASHFLOW_CATEGORIES.filter((c) => c !== "Pembayaran Invoice").map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Referensi (opsional)">
            <Input value={referensi} onChange={(e) => setReferensi(e.target.value)} placeholder="Contoh: PO-0042" />
          </Field>
          <Field label="Nominal">
            <Input required type="number" value={nominal} onChange={(e) => setNominal(e.target.value)} placeholder="Rp 0" />
          </Field>
        </FormGrid>

        {error && <div className="mt-3 font-mono text-[0.75rem] text-danger">{error}</div>}

        <FormActions>
          <Button variant="clay" type="submit" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Pengeluaran"}
          </Button>
          <LinkButton variant="ghost" href="/keuangan">
            Batal
          </LinkButton>
        </FormActions>
      </form>
    </Panel>
  );
}
