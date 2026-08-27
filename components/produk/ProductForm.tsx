"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input, Select, Textarea, CurrencyInput } from "@/components/ui/Form";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
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
  dayaListrik: string;
  fotoUrl: string;
  fotoSampingUrl: string;
  fotoBelakangUrl: string;
  deskripsi: string;
}

const EMPTY_BASE: Omit<ProductFormValues, "category"> = {
  name: "",
  merk: "",
  // Defaults to "bekas" per the user's request 2026-08-25 (most products
  // entered here are used stock) — komisiPercent below is kept in sync.
  kondisi: "bekas",
  // No longer a form field (see the user's request 2026-08-25) — purely
  // display (the "Bekas — Kondisi N%" badge in Katalog), never fed into
  // commission math, so hiding the input is safe. Same "hidden but not
  // removed" treatment as stokMinimum/alertHariTidakTerjual.
  kondisiPercent: "",
  tipeProduk: "non-elektronik",
  hargaRekomendasi: "",
  hargaMinimum: "",
  // Matches the real invoice-time commission rule (see the hint text below
  // the field) — 6% for baru, 10% for bekas. Kept in sync with `kondisi`
  // by the Kondisi select's onChange, not just this initial value.
  komisiPercent: "10",
  stok: "1",
  tanggalBarangMasuk: "",
  // No longer a form field (see the user's request 2026-08-25) — schema
  // default (LOW_STOCK_THRESHOLD) is preserved by still sending it, just
  // never rendered/edited here. Purchasing's auto-suggested PO list still
  // uses it. Same "hidden but not removed" treatment as
  // alertHariTidakTerjual below.
  stokMinimum: "5",
  // No longer a form field (see confirmation 2026-08-20) — schema default
  // (45) is preserved by still sending it, just never rendered/edited here.
  alertHariTidakTerjual: "45",
  panjangCm: "",
  lebarCm: "",
  tinggiCm: "",
  ketebalan: "1mm",
  dayaListrik: "",
  fotoUrl: "",
  // No longer form fields (see the user's request 2026-08-25 — just one
  // photo now) — kept here so an existing product's already-uploaded
  // samping/belakang photos aren't silently wiped out by a save from this
  // form, same "hidden but not removed" treatment as above.
  fotoSampingUrl: "",
  fotoBelakangUrl: "",
  deskripsi: "",
};

/**
 * One P/L/T box — max 3 digits, "000" placeholder, auto-advances to
 * `nextRef` the moment the 3rd digit lands. Back to three separate inputs
 * per the user's request 2026-08-25 (superseding the single free-typed
 * field from earlier the same day).
 */
const LAST_KATEGORI_KEY = "horeca-produk-last-kategori";

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

export default function ProductForm({
  mode,
  productId,
  initial,
  categories,
  onSuccess,
  onCancel,
}: {
  mode: "create" | "edit";
  productId?: string;
  initial?: Partial<ProductFormValues>;
  categories: string[];
  // Both default to the original navigate-to-/produk behavior — only the
  // Katalog inline edit drawer (2026-08-27) passes its own, so saving/
  // cancelling from there stays on the Katalog page instead of leaving it.
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProductFormValues>(() => {
    const merged = { ...EMPTY_BASE, category: categories[0] ?? "", ...initial };
    // Defaults to today whenever there's no real value yet — a brand-new
    // product being entered now, or an existing one saved before this field
    // existed. Per the user's request 2026-08-25.
    return { ...merged, tanggalBarangMasuk: merged.tanggalBarangMasuk || new Date().toISOString().slice(0, 10) };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lebarRef = useRef<HTMLInputElement>(null);
  const tinggiRef = useRef<HTMLInputElement>(null);

  // Kategori defaults to whichever one was used last (per the user's request
  // 2026-08-25) — entering several products of the same category in a row
  // shouldn't mean reselecting it every time. Only in create mode, and only
  // reading localStorage after mount (not in useState's initializer) so the
  // server-rendered HTML and the client's first render still match — same
  // pattern CartProvider.tsx uses for its own localStorage hydration.
  useEffect(() => {
    if (mode !== "create") return;
    const lastKategori = localStorage.getItem(LAST_KATEGORI_KEY);
    if (lastKategori && categories.includes(lastKategori)) {
      setValues((v) => ({ ...v, category: lastKategori }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const komisiNominal = useMemo(() => {
    const pct = Number(values.komisiPercent) || 0;
    const harga = Number(values.hargaRekomendasi) || 0;
    return Math.round((pct / 100) * harga);
  }, [values.komisiPercent, values.hargaRekomendasi]);

  // Harga Modal — per the user's request 2026-08-25: no longer a manual
  // entry, always Harga Minimum ÷ 2. Still saved into the schema's
  // `hargaBeli` field (same "cost basis" concept the field already was).
  const hargaModal = useMemo(() => Math.round((Number(values.hargaMinimum) || 0) / 2), [values.hargaMinimum]);

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  // Kondisi drives the commission default (6% baru, 10% bekas), matching
  // the real invoice-time calculation — see the hint on the Komisi field
  // below. Still just a default: the field stays editable afterward.
  function setKondisi(kondisi: "baru" | "bekas") {
    setValues((v) => ({ ...v, kondisi, komisiPercent: kondisi === "bekas" ? "10" : "6" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // The Kategori field is a free-typed search box now (see the datalist
    // below) — only accept a value that's actually one of the real
    // categories, so a typo or partial search term can't get saved as the
    // product's category.
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
      localStorage.setItem(LAST_KATEGORI_KEY, values.category);
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
          <Field label="Kategori" hint="Ketik untuk cari, Enter pilih yang paling atas — defaultnya kategori terakhir yang dipakai.">
            <SearchableSelect
              value={values.category}
              onChange={(v) => set("category", v)}
              options={categories}
              placeholder="Cari atau pilih kategori..."
              emptyLabel="Tidak ada kategori yang cocok."
            />
            {categories.length === 0 && (
              <div className="mt-1 font-mono text-[0.7rem] text-clay">
                Belum ada kategori — tambahkan dulu di halaman Admin.
              </div>
            )}
          </Field>

          <Field label="Kondisi" hint="Menentukan default Komisi per Item — 6% untuk baru, 10% untuk bekas.">
            <Select value={values.kondisi} onChange={(e) => setKondisi(e.target.value as "baru" | "bekas")}>
              <option value="baru">Baru</option>
              <option value="bekas">Bekas</option>
            </Select>
          </Field>
          <Field label="Tipe Produk" hint="Menentukan apakah Ketebalan Material berlaku untuk produk ini.">
            <Select
              value={values.tipeProduk}
              onChange={(e) => set("tipeProduk", e.target.value as "elektronik" | "non-elektronik")}
            >
              <option value="non-elektronik">Non-Elektronik</option>
              <option value="elektronik">Elektronik</option>
            </Select>
          </Field>

          <Field
            label="Harga Minimum"
            hint={values.kondisi === "bekas" ? "= \"Harga bottom\" — dipakai untuk hitung komisi barang bekas." : undefined}
          >
            <CurrencyInput
              required
              value={values.hargaMinimum}
              onChange={(v) => set("hargaMinimum", v)}
              placeholder="0"
            />
          </Field>
          <Field label="Harga Modal" hint="Otomatis = Harga Minimum ÷ 2.">
            <Input disabled value={rupiah(hargaModal)} />
          </Field>
          <Field label="Harga Rekomendasi">
            <CurrencyInput
              required
              value={values.hargaRekomendasi}
              onChange={(v) => set("hargaRekomendasi", v)}
              placeholder="0"
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

          <Field label="Ukuran P × L × T (cm)">
            <div className="flex items-center gap-2">
              <DimensiDigitInput value={values.panjangCm} onChange={(v) => set("panjangCm", v)} nextRef={lebarRef} />
              <span className="text-muted">×</span>
              <DimensiDigitInput value={values.lebarCm} onChange={(v) => set("lebarCm", v)} nextRef={tinggiRef} inputRef={lebarRef} />
              <span className="text-muted">×</span>
              <DimensiDigitInput value={values.tinggiCm} onChange={(v) => set("tinggiCm", v)} inputRef={tinggiRef} />
            </div>
          </Field>
          {values.tipeProduk !== "elektronik" && (
            <Field label="Ketebalan Material">
              <Input value={values.ketebalan} onChange={(e) => set("ketebalan", e.target.value)} placeholder="Contoh: 1.2 mm" />
            </Field>
          )}
          {values.tipeProduk === "elektronik" && (
            <Field label="Daya Listrik">
              <Input value={values.dayaListrik} onChange={(e) => set("dayaListrik", e.target.value)} placeholder="Contoh: 1200 Watt" />
            </Field>
          )}

          <Field label="Foto Produk" span2 hint="Tampil di Katalog, kartu produk, dan PDF katalog.">
            <UploadBox folder="products" value={values.fotoUrl} onChange={(url) => set("fotoUrl", url)} />
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
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Batal
            </Button>
          ) : (
            <LinkButton variant="ghost" href="/produk">
              Batal
            </LinkButton>
          )}
        </FormActions>
      </form>
    </Panel>
  );
}
