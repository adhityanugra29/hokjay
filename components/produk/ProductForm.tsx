"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input, Select, Textarea } from "@/components/ui/Form";
import { Button, LinkButton } from "@/components/ui/Button";
import UploadBox from "@/components/ui/UploadBox";
import { rupiah } from "@/lib/format";

export interface ProductFormValues {
  name: string;
  merk: string;
  category: string;
  kondisi: "baru" | "bekas";
  kondisiPercent: string;
  tipeProduk: "elektronik" | "non-elektronik";
  hargaBeli: string;
  hargaRekomendasi: string;
  hargaMinimum: string;
  komisiPercent: string;
  stok: string;
  tanggalBarangMasuk: string;
  stokMinimum: string;
  alertHariTidakTerjual: string;
  panjangCm: string;
  lebarCm: string;
  tinggiCm: string;
  ketebalan: string;
  fotoUrl: string;
  fotoSampingUrl: string;
  fotoBelakangUrl: string;
  deskripsi: string;
}

const EMPTY_BASE: Omit<ProductFormValues, "category"> = {
  name: "",
  merk: "",
  kondisi: "baru",
  kondisiPercent: "",
  tipeProduk: "non-elektronik",
  hargaBeli: "",
  hargaRekomendasi: "",
  hargaMinimum: "",
  komisiPercent: "5",
  stok: "0",
  tanggalBarangMasuk: "",
  stokMinimum: "5",
  // No longer a form field (see confirmation 2026-08-20) — schema default
  // (45) is preserved by still sending it, just never rendered/edited here.
  alertHariTidakTerjual: "45",
  panjangCm: "",
  lebarCm: "",
  tinggiCm: "",
  ketebalan: "",
  fotoUrl: "",
  fotoSampingUrl: "",
  fotoBelakangUrl: "",
  deskripsi: "",
};

export default function ProductForm({
  mode,
  productId,
  initial,
  categories,
}: {
  mode: "create" | "edit";
  productId?: string;
  initial?: Partial<ProductFormValues>;
  categories: string[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProductFormValues>({
    ...EMPTY_BASE,
    category: categories[0] ?? "",
    // Defaults to today for a brand-new product — it's presumably arriving
    // as it's being entered; edit mode always has an explicit `initial`.
    tanggalBarangMasuk: mode === "create" ? new Date().toISOString().slice(0, 10) : "",
    ...initial,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const komisiNominal = useMemo(() => {
    const pct = Number(values.komisiPercent) || 0;
    const harga = Number(values.hargaRekomendasi) || 0;
    return Math.round((pct / 100) * harga);
  }, [values.komisiPercent, values.hargaRekomendasi]);

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name: values.name,
      merk: values.merk || undefined,
      category: values.category,
      kondisi: values.kondisi,
      kondisiPercent: values.kondisi === "bekas" && values.kondisiPercent ? Number(values.kondisiPercent) : undefined,
      tipeProduk: values.tipeProduk,
      // Create mode has no Harga Beli field anymore (defaults to 0 — cost
      // basis is meant to come from a future Pembelian Barang/restock-cost
      // flow instead, see 2026-08-20 discussion); edit mode still sends
      // whatever's in the field since it's editable there.
      hargaBeli: Number(values.hargaBeli || 0),
      hargaRekomendasi: Number(values.hargaRekomendasi),
      hargaMinimum: Number(values.hargaMinimum),
      komisiPercent: Number(values.komisiPercent),
      stok: Number(values.stok),
      tanggalBarangMasuk: values.tanggalBarangMasuk ? new Date(values.tanggalBarangMasuk) : undefined,
      stokMinimum: Number(values.stokMinimum) || 0,
      alertHariTidakTerjual: Number(values.alertHariTidakTerjual),
      dimensi:
        values.panjangCm || values.lebarCm || values.tinggiCm
          ? {
              panjangCm: Number(values.panjangCm) || undefined,
              lebarCm: Number(values.lebarCm) || undefined,
              tinggiCm: Number(values.tinggiCm) || undefined,
            }
          : undefined,
      ketebalan: values.tipeProduk === "elektronik" ? undefined : values.ketebalan || undefined,
      fotoUrl: values.fotoUrl || undefined,
      fotoSampingUrl: values.fotoSampingUrl || undefined,
      fotoBelakangUrl: values.fotoBelakangUrl || undefined,
      deskripsi: values.deskripsi || undefined,
    };

    try {
      const res = await fetch(mode === "create" ? "/api/products" : `/api/products/${productId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal menyimpan produk");
      }
      router.push("/produk");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan produk");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel className="max-w-3xl p-7">
      <form onSubmit={handleSubmit}>
        <FormGrid>
          <Field label="Nama Produk">
            <Input
              required
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Contoh: Meja Kerja Stainless Steel 120cm"
            />
          </Field>
          <Field label="Merk" hint="Opsional — nama merek/brand produk.">
            <Input
              value={values.merk}
              onChange={(e) => set("merk", e.target.value)}
              placeholder="Contoh: Getra"
            />
          </Field>
          <Field label="Kategori">
            <Select value={values.category} onChange={(e) => set("category", e.target.value)}>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            {categories.length === 0 && (
              <div className="mt-1 font-mono text-[0.7rem] text-clay">
                Belum ada kategori — tambahkan dulu di halaman Admin.
              </div>
            )}
          </Field>

          <Field label="Kondisi">
            <Select value={values.kondisi} onChange={(e) => set("kondisi", e.target.value as "baru" | "bekas")}>
              <option value="baru">Baru</option>
              <option value="bekas">Bekas</option>
            </Select>
          </Field>
          {values.kondisi === "bekas" && (
            <Field label="Kondisi (%)">
              <Input
                type="number"
                min={0}
                max={100}
                value={values.kondisiPercent}
                onChange={(e) => set("kondisiPercent", e.target.value)}
                placeholder="Contoh: 88"
              />
            </Field>
          )}
          <Field label="Tipe Produk" hint="Menentukan apakah Ketebalan Material berlaku untuk produk ini.">
            <Select
              value={values.tipeProduk}
              onChange={(e) => set("tipeProduk", e.target.value as "elektronik" | "non-elektronik")}
            >
              <option value="non-elektronik">Non-Elektronik</option>
              <option value="elektronik">Elektronik</option>
            </Select>
          </Field>

          {mode === "edit" && (
            <Field label="Harga Beli">
              <Input
                type="number"
                value={values.hargaBeli}
                onChange={(e) => set("hargaBeli", e.target.value)}
                placeholder="Rp 0"
              />
            </Field>
          )}
          <Field label="Harga Rekomendasi">
            <Input
              required
              type="number"
              value={values.hargaRekomendasi}
              onChange={(e) => set("hargaRekomendasi", e.target.value)}
              placeholder="Rp 0"
            />
          </Field>
          <Field
            label="Harga Minimum"
            hint={values.kondisi === "bekas" ? "= \"Harga bottom\" — dipakai untuk hitung komisi barang bekas." : undefined}
          >
            <Input
              required
              type="number"
              value={values.hargaMinimum}
              onChange={(e) => set("hargaMinimum", e.target.value)}
              placeholder="Rp 0"
            />
          </Field>

          <Field
            label="Komisi per Item — Persen"
            hint="Nilai referensi saja — komisi invoice sekarang dihitung otomatis (6% barang baru/custom, atau 10% harga bottom / selisih untuk barang bekas)."
          >
            <Input
              type="number"
              min={0}
              max={100}
              value={values.komisiPercent}
              onChange={(e) => set("komisiPercent", e.target.value)}
            />
          </Field>
          <Field label="Komisi per Item — Nominal">
            <Input disabled value={rupiah(komisiNominal)} />
          </Field>

          <Field label="Stok Awal">
            <Input type="number" value={values.stok} onChange={(e) => set("stok", e.target.value)} />
          </Field>
          <Field label="Tanggal Barang Masuk">
            <Input type="date" value={values.tanggalBarangMasuk} onChange={(e) => set("tanggalBarangMasuk", e.target.value)} />
          </Field>

          <Field label="Stok Minimum" hint="Kalau stok di bawah ini, muncul usulan PO otomatis di Purchasing.">
            <Input type="number" min={0} value={values.stokMinimum} onChange={(e) => set("stokMinimum", e.target.value)} />
          </Field>

          <Field label="Panjang (cm)">
            <Input type="number" value={values.panjangCm} onChange={(e) => set("panjangCm", e.target.value)} />
          </Field>
          <Field label="Lebar (cm)">
            <Input type="number" value={values.lebarCm} onChange={(e) => set("lebarCm", e.target.value)} />
          </Field>
          <Field label="Tinggi (cm)">
            <Input type="number" value={values.tinggiCm} onChange={(e) => set("tinggiCm", e.target.value)} />
          </Field>
          {values.tipeProduk !== "elektronik" && (
            <Field label="Ketebalan Material">
              <Input value={values.ketebalan} onChange={(e) => set("ketebalan", e.target.value)} placeholder="Contoh: 1.2 mm" />
            </Field>
          )}

          <Field label="Foto Tampak Depan" hint="Foto ini yang tampil di Katalog, kartu produk, dan PDF katalog.">
            <UploadBox folder="products" value={values.fotoUrl} onChange={(url) => set("fotoUrl", url)} />
          </Field>
          <Field label="Foto Tampak Samping" hint="Referensi tambahan, tidak tampil di Katalog.">
            <UploadBox folder="products" value={values.fotoSampingUrl} onChange={(url) => set("fotoSampingUrl", url)} />
          </Field>
          <Field label="Foto Tampak Belakang" hint="Referensi tambahan, tidak tampil di Katalog.">
            <UploadBox folder="products" value={values.fotoBelakangUrl} onChange={(url) => set("fotoBelakangUrl", url)} />
          </Field>

          <Field label="Deskripsi (tampil di katalog)" span2>
            <Textarea
              rows={3}
              value={values.deskripsi}
              onChange={(e) => set("deskripsi", e.target.value)}
              placeholder="Deskripsi singkat produk untuk pelanggan..."
            />
          </Field>
        </FormGrid>

        {error && <div className="mt-3 font-mono text-[0.75rem] text-danger">{error}</div>}

        <FormActions>
          <Button type="submit" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Produk"}
          </Button>
          <LinkButton variant="ghost" href="/produk">
            Batal
          </LinkButton>
        </FormActions>
      </form>
    </Panel>
  );
}
