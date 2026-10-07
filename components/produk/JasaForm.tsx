"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormCard, FormSection, FormCardActions } from "@/components/ui/FormSection";
import { Field, FormGrid, Input, Select } from "@/components/ui/Form";
import { Button, LinkButton } from "@/components/ui/Button";

export interface JasaFormValues {
  nama: string;
  kode: string;
  aktif: boolean;
}

const EMPTY: JasaFormValues = { nama: "", kode: "", aktif: true };

export default function JasaForm({
  mode,
  jasaId,
  initial,
}: {
  mode: "create" | "edit";
  jasaId?: string;
  initial?: JasaFormValues;
}) {
  const router = useRouter();
  const [values, setValues] = useState<JasaFormValues>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof JasaFormValues>(key: K, value: JasaFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!values.nama.trim()) {
      setError("Nama jasa wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(mode === "create" ? "/api/jasa" : `/api/jasa/${jasaId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: values.nama.trim(),
          kode: values.kode.trim() || undefined,
          aktif: values.aktif,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal menyimpan jasa");
      }
      router.push("/produk/jasa");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan jasa");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <FormCard
        title={mode === "create" ? "Jasa Baru" : "Ubah Jasa"}
        description="Harga jasa diisi langsung di invoice, bukan di sini. Jasa tidak punya stok, komisi, HPP, maupun diskon."
        className="max-w-3xl"
      >
        <FormSection label="Data Jasa" last>
          <FormGrid>
            <Field label="Nama Jasa" span2>
              <Input value={values.nama} onChange={(e) => set("nama", e.target.value)} required />
            </Field>
            <Field label="Kode" hint={mode === "create" ? "Kosongkan untuk dibuat otomatis" : undefined}>
              <Input value={values.kode} onChange={(e) => set("kode", e.target.value)} placeholder="JS-0001" />
            </Field>
            <Field label="Status" hint="Nonaktif = tidak bisa ditambahkan ke invoice baru">
              <Select value={values.aktif ? "1" : "0"} onChange={(e) => set("aktif", e.target.value === "1")}>
                <option value="1">Aktif</option>
                <option value="0">Nonaktif</option>
              </Select>
            </Field>
          </FormGrid>
        </FormSection>
        {error && <div className="px-6 font-mono text-[0.75rem] text-danger">{error}</div>}
        <FormCardActions>
          <Button type="submit" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Jasa"}
          </Button>
          <LinkButton href="/produk/jasa" variant="ghost">
            Batal
          </LinkButton>
        </FormCardActions>
      </FormCard>
    </form>
  );
}
