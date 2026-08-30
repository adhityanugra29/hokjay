"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormCard, FormSection, FormCardActions } from "@/components/ui/FormSection";
import { Field, FormGrid, Input, Textarea } from "@/components/ui/Form";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Button, LinkButton } from "@/components/ui/Button";
import { JENIS_USAHA_OPTIONS } from "@/lib/constants";
import { INDONESIA_REGIONS, guessRegionFromAddress } from "@/lib/wilayah";

export interface CustomerFormValues {
  nama: string;
  namaToko: string;
  jenisUsaha: string;
  jenisUsahaLainnya: string;
  whatsapp: string;
  email: string;
  alamat: string;
  provinsi: string;
  kota: string;
  termHari: string;
  catatan: string;
}

const EMPTY_VALUES: CustomerFormValues = {
  nama: "",
  namaToko: "",
  jenisUsaha: "",
  jenisUsahaLainnya: "",
  whatsapp: "",
  email: "",
  alamat: "",
  provinsi: "",
  kota: "",
  termHari: "0",
  catatan: "",
};

export default function CustomerForm({
  mode = "create",
  customerId,
  initial,
}: {
  mode?: "create" | "edit";
  customerId?: string;
  initial?: Partial<CustomerFormValues>;
} = {}) {
  const router = useRouter();
  const [values, setValues] = useState<CustomerFormValues>({ ...EMPTY_VALUES, ...initial });
  // Kota/Kabupaten options narrow to whichever provinsi is picked — per the
  // user's request 2026-08-25. Picking a different provinsi clears
  // whatever kota was already chosen since it likely doesn't belong there.
  const kotaOptions = INDONESIA_REGIONS.find((r) => r.provinsi === values.provinsi)?.kota ?? [];
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Provinsi/Kota are wajib (not opsional) per the user's request
    // 2026-08-25 — SearchableSelect isn't a real <select>, so the
    // browser's native `required` doesn't catch an empty value; checked
    // explicitly here instead.
    if (!values.provinsi) return setError("Provinsi wajib diisi.");
    if (!values.kota) return setError("Kota / Kabupaten wajib diisi.");
    setSaving(true);
    try {
      // "Lainnya" isn't a real business category — when picked, the typed
      // free-text replaces it as the actual stored jenisUsaha (the schema
      // has no separate field for it, just one free-text jenisUsaha).
      const payload = {
        ...values,
        jenisUsaha:
          values.jenisUsaha === "Lainnya" && values.jenisUsahaLainnya.trim()
            ? values.jenisUsahaLainnya.trim()
            : values.jenisUsaha,
      };
      const url = mode === "edit" ? `/api/customers/${customerId}` : "/api/customers";
      const res = await fetch(url, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || (mode === "edit" ? "Gagal memperbarui pelanggan" : "Gagal menyimpan pelanggan"));
      }
      router.push(mode === "edit" ? `/pelanggan/${customerId}` : "/pelanggan");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan pelanggan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormCard
      className="max-w-2xl"
      title="Data Pelanggan"
      description="Isi selengkap mungkin — Provinsi & Kota wajib untuk perhitungan ongkos kirim."
    >
      <form onSubmit={handleSubmit}>
        <FormSection label="Identitas">
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
              <Field label="Sebutkan Jenis Usaha" span2>
                <Input
                  required
                  value={values.jenisUsahaLainnya}
                  onChange={(e) => setValues((v) => ({ ...v, jenisUsahaLainnya: e.target.value }))}
                  placeholder="Contoh: Katering Rumahan"
                />
              </Field>
            )}
          </FormGrid>
        </FormSection>

        <FormSection label="Kontak">
          <FormGrid>
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
          </FormGrid>
        </FormSection>

        <FormSection label="Alamat">
          {/* Provinsi -> Kota -> Alamat, in that order — per the user's
              request 2026-08-25. */}
          <FormGrid>
            <Field label="Provinsi">
              <SearchableSelect
                value={values.provinsi}
                onChange={(v) => setValues((prev) => ({ ...prev, provinsi: v, kota: "" }))}
                options={INDONESIA_REGIONS.map((r) => r.provinsi)}
                placeholder="Ketik untuk cari provinsi..."
              />
            </Field>
            <Field label="Kota / Kabupaten">
              <SearchableSelect
                value={values.kota}
                onChange={(v) => setValues((prev) => ({ ...prev, kota: v }))}
                options={kotaOptions}
                placeholder={values.provinsi ? "Ketik untuk cari kota/kabupaten..." : "Pilih provinsi dulu"}
              />
            </Field>
            <Field label="Alamat" span2>
              <Input
                required
                value={values.alamat}
                onChange={(e) => setValues((v) => ({ ...v, alamat: e.target.value }))}
                // Auto-fills Provinsi/Kota by scanning the pasted alamat for a
                // kota/kabupaten name — only when neither is already set, so
                // it never clobbers a manual pick. Per the user's request
                // 2026-08-25 (sales usually pastes a full WhatsApp address).
                onBlur={(e) => {
                  if (values.provinsi || values.kota) return;
                  const guess = guessRegionFromAddress(e.target.value);
                  if (guess) setValues((v) => ({ ...v, provinsi: guess.provinsi, kota: guess.kota }));
                }}
                placeholder="Alamat lengkap untuk pengiriman & penagihan"
              />
            </Field>
          </FormGrid>
        </FormSection>

        {/* Termin Pembayaran hidden from the form per the user's request
            2026-08-25 — termHari stays in state/payload (always "0" =
            tunai) since Pelanggan's "kebiasaan bayar" calc still reads it. */}
        <FormSection label="Catatan" last>
          <FormGrid>
            <Field label="Catatan (opsional)" span2>
              <Textarea
                rows={3}
                value={values.catatan}
                onChange={(e) => setValues((v) => ({ ...v, catatan: e.target.value }))}
                placeholder="Catatan khusus untuk pelanggan ini..."
              />
            </Field>
          </FormGrid>
        </FormSection>

        {error && <div className="px-6 font-mono text-[0.75rem] text-danger">{error}</div>}

        <FormCardActions>
          <Button type="submit" disabled={saving}>
            {saving ? "Menyimpan..." : mode === "edit" ? "Simpan Perubahan" : "Simpan Pelanggan"}
          </Button>
          <LinkButton variant="ghost" href={mode === "edit" ? `/pelanggan/${customerId}` : "/pelanggan"}>
            Batal
          </LinkButton>
        </FormCardActions>
      </form>
    </FormCard>
  );
}
