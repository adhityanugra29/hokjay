"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FormCard, FormSection, FormCardActions } from "@/components/ui/FormSection";
import { Field, Input, Select, Textarea, CurrencyInput } from "@/components/ui/Form";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Button, LinkButton } from "@/components/ui/Button";
import UploadBox from "@/components/ui/UploadBox";
import { rupiah } from "@/lib/format";
import { DEFAULT_KOMISI_BEKAS_PERCENT, DEFAULT_KOMISI_BARU_PERCENT } from "@/lib/commission";

export interface ProductFormValues {
  name: string;
  merk: string;
  category: string;
  kondisi: "baru" | "bekas";
  kondisiPercent: string;
  tipeProduk: "elektronik" | "non-elektronik";
  hargaRekomendasi: string;
  hargaMinimum: string;
  komisiPercent: string;
  /**
   * Owner-only override of the real invoice-time bekas commission rate (normally 10% of Harga Bottom); separate from komisiPercent above, which is
   * reference-only. Empty = no override (category default, then global 10%).
   */
  komisiBekasPercent: string;
  stok: string;
  tanggalBarangMasuk: string;
  stokMinimum: string;
  alertHariTidakTerjual: string;
  panjangCm: string;
  lebarCm: string;
  tinggiCm: string;
  ketebalan: string;
  dayaListrik: string;
  fotoUrl: string;
  fotoSampingUrl: string;
  fotoBelakangUrl: string;
  deskripsi: string;
}

const EMPTY_BASE: Omit<ProductFormValues, "category"> = {
  name: "",
  merk: "",
  // Defaults to "bekas" (most products entered are used stock); komisiPercent below is kept in sync.
  kondisi: "bekas",
  // Not a form field: display only (the "Bekas — Kondisi N%" badge in Katalog), never fed into commission math. "Hidden but not removed", like stokMinimum/alertHariTidakTerjual.
  kondisiPercent: "",
  tipeProduk: "non-elektronik",
  hargaRekomendasi: "",
  hargaMinimum: "",
  // Matches the real invoice-time rule: 6% baru, 10% bekas; kept in sync with `kondisi` by the Kondisi select's onChange.
  komisiPercent: "10",
  komisiBekasPercent: "",
  stok: "1",
  tanggalBarangMasuk: "",
  // Not a form field: the schema default (LOW_STOCK_THRESHOLD) is preserved by still sending it. Purchasing's auto-suggested PO list uses it.
  stokMinimum: "5",
  // Not a form field: the schema default (45) is preserved by still sending it.
  alertHariTidakTerjual: "45",
  panjangCm: "",
  lebarCm: "",
  tinggiCm: "",
  ketebalan: "1mm",
  dayaListrik: "",
  fotoUrl: "",
  // Not form fields (one photo now): kept so an existing product's samping/belakang photos aren't wiped by a save from this form.
  fotoSampingUrl: "",
  fotoBelakangUrl: "",
  deskripsi: "",
};

/** One P/L/T box: max 3 digits, "000" placeholder, auto-advances to `nextRef` when the 3rd digit lands. */
function DimensiDigitInput({
  value,
  onChange,
  nextRef,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  nextRef?: React.RefObject<HTMLInputElement | null>;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      maxLength={3}
      placeholder="000"
      value={value}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
        onChange(digits);
        if (digits.length === 3) nextRef?.current?.focus();
      }}
      className="text-center"
    />
  );
}

/** Reads Nama Produk + Ukuran P×L×T from the photo's filename (the workflow is per photo). */
export function parseProductFilename(filename: string): { name: string; dims: { p: string; l: string; t: string } | null } {
  const base = filename.replace(/\.[^/.]+$/, ""); // strip extension
  const dimMatch = base.match(/(\d{1,4})\s*[xX×]\s*(\d{1,4})\s*[xX×]\s*(\d{1,4})/);
  let name = base;
  let dims: { p: string; l: string; t: string } | null = null;
  if (dimMatch) {
    dims = { p: dimMatch[1], l: dimMatch[2], t: dimMatch[3] };
    name = base.slice(0, dimMatch.index) + base.slice(dimMatch.index! + dimMatch[0].length);
  }
  name = name.replace(/[_-]+/g, " ").replace(/\s{2,}/g, " ").trim();
  return { name, dims };
}

export default function ProductForm({
  mode,
  productId,
  initial,
  categories,
  isOwner,
  onSuccess,
  onCancel,
}: {
  mode: "create" | "edit";
  productId?: string;
  initial?: Partial<ProductFormValues>;
  categories: string[];
  /** Owner/Super Admin only — shows the Komisi Bekas override field. */
  isOwner?: boolean;
  // Both default to navigate-to-/produk; only the Katalog inline edit drawer passes its own, so saving/cancelling there stays on the Katalog page.
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProductFormValues>(() => {
    const merged = { ...EMPTY_BASE, category: categories[0] ?? "", ...initial };
    // Defaults to today when there's no real value yet (a new product, or an existing one saved before this field existed).
    return { ...merged, tanggalBarangMasuk: merged.tanggalBarangMasuk || new Date().toISOString().slice(0, 10) };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lebarRef = useRef<HTMLInputElement>(null);
  const tinggiRef = useRef<HTMLInputElement>(null);

  // Komisi Nominal mirrors the REAL commission formula (computeLineCommission): bekas = Harga Bottom × Komisi Bekas% (the guaranteed floor commission, same as
  // maxDiskonBekas's base); baru = flat 6% of Harga Rekomendasi (no per-product override, so static). It used to read the removed "Komisi — Persen" field and went stale.
  const komisiNominal = useMemo(() => {
    const hargaRekomendasi = Number(values.hargaRekomendasi) || 0;
    if (values.kondisi === "bekas") {
      const hargaMinimum = Number(values.hargaMinimum) || 0;
      const pct = values.komisiBekasPercent ? Number(values.komisiBekasPercent) : DEFAULT_KOMISI_BEKAS_PERCENT;
      return Math.round((pct / 100) * hargaMinimum);
    }
    return Math.round((DEFAULT_KOMISI_BARU_PERCENT / 100) * hargaRekomendasi);
  }, [values.kondisi, values.komisiBekasPercent, values.hargaMinimum, values.hargaRekomendasi]);

  // Harga Modal is always Harga Minimum ÷ 2 (no manual entry); still saved into the schema's `hargaBeli`.
  const hargaModal = useMemo(() => Math.round((Number(values.hargaMinimum) || 0) / 2), [values.hargaMinimum]);

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  // Autofill Nama Produk / Ukuran from the photo's filename; never overwrites a field the user already typed (checked per field).
  function handlePhotoSelected(file: File) {
    const parsed = parseProductFilename(file.name);
    setValues((v) => {
      const next = { ...v };
      if (parsed.name && !v.name.trim()) next.name = parsed.name;
      if (parsed.dims && !v.panjangCm.trim() && !v.lebarCm.trim() && !v.tinggiCm.trim()) {
        next.panjangCm = parsed.dims.p;
        next.lebarCm = parsed.dims.l;
        next.tinggiCm = parsed.dims.t;
      }
      return next;
    });
  }

  // Kondisi drives the commission default (6% baru, 10% bekas), matching invoice time; still just a default.
  function setKondisi(kondisi: "baru" | "bekas") {
    setValues((v) => ({ ...v, kondisi, komisiPercent: kondisi === "bekas" ? "10" : "6" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Kategori is a free-typed search box, so only accept an actual category (a typo or partial term must not be saved).
    if (!categories.includes(values.category)) {
      setError("Kategori tidak dikenal — pilih salah satu dari daftar kategori yang ada.");
      return;
    }

    setSaving(true);

    const payload = {
      name: values.name,
      merk: values.merk || undefined,
      category: values.category,
      kondisi: values.kondisi,
      kondisiPercent: values.kondisi === "bekas" && values.kondisiPercent ? Number(values.kondisiPercent) : undefined,
      tipeProduk: values.tipeProduk,
      // No longer a manual field — always Harga Minimum ÷ 2 (see hargaModal above).
      hargaBeli: hargaModal,
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
      dayaListrik: values.tipeProduk === "elektronik" ? values.dayaListrik || undefined : undefined,
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
      // Both Komisi fields go through their own Owner-only endpoint (komisi-bekas/route.ts), never the general PATCH: a separate request, sent only when
      // isOwner, after the product is saved so a new product has an _id to target.
      if (isOwner) {
        const saved = await res.json();
        const id = mode === "create" ? saved._id : productId;
        const komisiRes = await fetch(`/api/products/${id}/komisi-bekas`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            komisiPercent: Number(values.komisiPercent),
            // Only meaningful for bekas; null clears any stored override when kondisi isn't bekas (the field wasn't shown).
            komisiBekasPercent:
              values.kondisi === "bekas" && values.komisiBekasPercent ? Number(values.komisiBekasPercent) : null,
          }),
        });
        if (!komisiRes.ok) {
          const body = await komisiRes.json().catch(() => ({}));
          throw new Error(body.error || "Produk tersimpan, tapi Komisi gagal disimpan");
        }
      }
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/produk");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan produk");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormCard
      className="max-w-3xl"
      title="Data Produk"
      description="Harga Modal & Komisi Nominal dihitung otomatis."
    >
      <form onSubmit={handleSubmit}>
        {/* Foto first (the work is per photo). The filename fills Nama Produk & Ukuran P×L×T, only into fields still empty (parseProductFilename/handlePhotoSelected). */}
        <FormSection label="Foto Produk" compact>
          <UploadBox
            folder="products"
            value={values.fotoUrl}
            onChange={(url) => set("fotoUrl", url)}
            onFileSelected={handlePhotoSelected}
            hint="Tampil di Katalog, kartu produk, dan PDF katalog · JPG/PNG, maks 5MB"
          />
        </FormSection>

        {/* Compact (3 columns): this form is filled many times a day, so speed beats whitespace. */}
        <FormSection label="Identitas & Stok" compact>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nama Produk" span2>
              <Input
                required
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Contoh: Meja Kerja Stainless Steel 120cm"
              />
            </Field>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Merk" hint="Opsional">
              <Input value={values.merk} onChange={(e) => set("merk", e.target.value)} placeholder="Contoh: Getra" />
            </Field>
            <Field label="Kategori">
              <SearchableSelect
                value={values.category}
                onChange={(v) => set("category", v)}
                options={categories}
                placeholder="Cari atau pilih kategori..."
                emptyLabel="Tidak ada kategori yang cocok."
              />
              {categories.length === 0 && (
                <div className="mt-1 font-mono text-[0.7rem] text-clay">Belum ada kategori.</div>
              )}
            </Field>
            <Field label="Kondisi">
              <Select value={values.kondisi} onChange={(e) => setKondisi(e.target.value as "baru" | "bekas")}>
                <option value="baru">Baru</option>
                <option value="bekas">Bekas</option>
              </Select>
            </Field>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Tipe Produk">
              <Select
                value={values.tipeProduk}
                onChange={(e) => set("tipeProduk", e.target.value as "elektronik" | "non-elektronik")}
              >
                <option value="non-elektronik">Non-Elektronik</option>
                <option value="elektronik">Elektronik</option>
              </Select>
            </Field>
            <Field label="Stok Awal">
              <Input type="number" value={values.stok} onChange={(e) => set("stok", e.target.value)} />
            </Field>
            <Field label="Tgl. Barang Masuk">
              <Input
                type="date"
                value={values.tanggalBarangMasuk}
                onChange={(e) => set("tanggalBarangMasuk", e.target.value)}
              />
            </Field>
          </div>
        </FormSection>

        {/* Order of the real typing flow: Harga Minimum -> Harga Rekomendasi -> Komisi. Derived values (Harga Modal, Komisi Nominal) sit below as plain text so they don't read as editable. */}
        <FormSection label="Harga & Komisi" compact>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field
              label="Harga Bottom"
              hint={values.kondisi === "bekas" ? "Dasar komisi bekas" : undefined}
            >
              <CurrencyInput required value={values.hargaMinimum} onChange={(v) => set("hargaMinimum", v)} placeholder="0" />
            </Field>
            <Field label="Harga Rekomendasi">
              <CurrencyInput required value={values.hargaRekomendasi} onChange={(v) => set("hargaRekomendasi", v)} placeholder="0" />
            </Field>
            {/* ONE visible commission field. The old "Komisi — Persen" input never drove real invoice commission (baru is a flat 6%, bekas uses komisiBekasPercent); it only fed
                komisiNominal for Dashboard's "Hot Products" insentif ranking (lib/dashboard.ts getHotProducts). komisiPercent still tracks kondisi under the hood (setKondisi), so that
                ranking keeps working. This field is Owner/Super Admin only: the invoice-time bekas rate override (it drives computeLineCommission); empty = category default, then 10%. */}
            {isOwner && values.kondisi === "bekas" && (
              <Field label="Komisi Bekas (%)" hint="Kosongkan untuk pakai default kategori/global (10%).">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={values.komisiBekasPercent}
                  onChange={(e) => set("komisiBekasPercent", e.target.value)}
                  placeholder="10"
                />
              </Field>
            )}
          </div>
          {/* Komisi Nominal is owner-only; Harga Modal (cost basis, not commission) stays visible to everyone who can edit a product. */}
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
            <span className="flex items-baseline gap-1.5 font-sans text-[0.74rem] text-muted">
              Harga Modal <span className="font-medium text-ink">{rupiah(hargaModal)}</span>
            </span>
            {isOwner && (
              <span className="flex items-baseline gap-1.5 font-sans text-[0.74rem] text-muted">
                Komisi Nominal <span className="font-medium text-ink">{rupiah(komisiNominal)}</span>
              </span>
            )}
          </div>
        </FormSection>

        <FormSection label="Dimensi & Spesifikasi" compact>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Ukuran P × L × T (cm)">
              <div className="flex items-center gap-2">
                <DimensiDigitInput value={values.panjangCm} onChange={(v) => set("panjangCm", v)} nextRef={lebarRef} />
                <span className="text-muted">×</span>
                <DimensiDigitInput value={values.lebarCm} onChange={(v) => set("lebarCm", v)} nextRef={tinggiRef} inputRef={lebarRef} />
                <span className="text-muted">×</span>
                <DimensiDigitInput value={values.tinggiCm} onChange={(v) => set("tinggiCm", v)} inputRef={tinggiRef} />
              </div>
            </Field>
            {values.tipeProduk !== "elektronik" ? (
              <Field label="Ketebalan Material">
                <Input value={values.ketebalan} onChange={(e) => set("ketebalan", e.target.value)} placeholder="Contoh: 1.2 mm" />
              </Field>
            ) : (
              <Field label="Daya Listrik">
                <Input value={values.dayaListrik} onChange={(e) => set("dayaListrik", e.target.value)} placeholder="Contoh: 1200 Watt" />
              </Field>
            )}
          </div>
        </FormSection>

        <FormSection label="Deskripsi" compact last>
          <Field label="Deskripsi (tampil di katalog)" hint="Opsional">
            <Textarea
              rows={3}
              value={values.deskripsi}
              onChange={(e) => set("deskripsi", e.target.value)}
              placeholder="Deskripsi singkat produk untuk pelanggan..."
            />
          </Field>
        </FormSection>

        {error && <div className="px-5 font-mono text-[0.75rem] text-danger">{error}</div>}

        <FormCardActions>
          <Button type="submit" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Produk"}
          </Button>
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Batal
            </Button>
          ) : (
            <LinkButton variant="ghost" href="/produk">
              Batal
            </LinkButton>
          )}
        </FormCardActions>
      </form>
    </FormCard>
  );
}
