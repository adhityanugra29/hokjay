"use client";

import { useState } from "react";
import { Field, FormGrid, FormActions, Input, Textarea } from "@/components/ui/Form";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Button } from "@/components/ui/Button";
import { JENIS_USAHA_OPTIONS } from "@/lib/constants";

export interface CreatedCustomer {
  _id: string;
  kode: string;
  nama: string;
  whatsapp: string;
  alamat: string;
}

/**
 * "+ Tambah Pelanggan" used to jump to /pelanggan/baru and back — now it
 * expands this inline form right on /penjualan instead, so adding a new
 * customer and picking them doesn't mean switching screens. See
 * confirmation with the user 2026-08-20.
 */
export default function InlineCustomerForm({
  onCreated,
  onCancel,
}: {
  onCreated: (customer: CreatedCustomer) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState({
    nama: "",
    namaToko: "",
    jenisUsaha: "",
    jenisUsahaLainnya: "",
    whatsapp: "",
    email: "",
    alamat: "",
    catatan: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...values,
        jenisUsaha:
          values.jenisUsaha === "Lainnya" && values.jenisUsahaLainnya.trim()
            ? values.jenisUsahaLainnya.trim()
            : values.jenisUsaha,
      };
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal menyimpan pelanggan");
      }
      const customer = await res.json();
      onCreated(customer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan pelanggan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 border-t border-line pt-4">
      <FormGrid>
        <Field label="Nama Pelanggan (PIC)" span2>
          <Input
            required
            value={values.nama}
            onChange={(e) => setValues((v) => ({ ...v, nama: e.target.value }))}
            placeholder="Contoh: Ibu Sari"
          />
        </Field>
        <Field label="Nama Toko / Usaha">
          <Input
            required
            value={values.namaToko}
            onChange={(e) => setValues((v) => ({ ...v, namaToko: e.target.value }))}
            placeholder="Contoh: Toko Kelontong Sari"
          />
        </Field>
        <Field label="Jenis Usaha">
          <SearchableSelect
            value={values.jenisUsaha}
            onChange={(v) => setValues((prev) => ({ ...prev, jenisUsaha: v }))}
            options={[...JENIS_USAHA_OPTIONS]}
            placeholder="Ketik untuk cari jenis usaha..."
          />
        </Field>
        {values.jenisUsaha === "Lainnya" && (
          <Field label="Sebutkan Jenis Usaha">
            <Input
              required
              value={values.jenisUsahaLainnya}
              onChange={(e) => setValues((v) => ({ ...v, jenisUsahaLainnya: e.target.value }))}
              placeholder="Contoh: Katering Rumahan"
            />
          </Field>
        )}
        <Field label="No. WhatsApp">
          <Input
            required
            value={values.whatsapp}
            onChange={(e) => setValues((v) => ({ ...v, whatsapp: e.target.value }))}
            placeholder="Contoh: 0812-3456-7890"
          />
        </Field>
        <Field label="Email (opsional)">
          <Input
            type="email"
            value={values.email}
            onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            placeholder="Contoh: sari@email.com"
          />
        </Field>
        <Field label="Alamat" span2>
          <Input
            required
            value={values.alamat}
            onChange={(e) => setValues((v) => ({ ...v, alamat: e.target.value }))}
            placeholder="Alamat lengkap untuk pengiriman & penagihan"
          />
        </Field>
        <Field label="Catatan (opsional)" span2>
          <Textarea
            rows={2}
            value={values.catatan}
            onChange={(e) => setValues((v) => ({ ...v, catatan: e.target.value }))}
            placeholder="Catatan khusus untuk pelanggan ini..."
          />
        </Field>
      </FormGrid>

      {error && <div className="mt-3 font-mono text-[0.75rem] text-danger">{error}</div>}

      <FormActions>
        <Button type="submit" disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan & Pilih Pelanggan"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Batal
        </Button>
      </FormActions>
    </form>
  );
}
