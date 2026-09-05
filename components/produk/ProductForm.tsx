"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
   * Owner-only override of the real invoice-time barang-bekas commission
   * rate (normally a flat 10% of Harga Bottom) — separate from komisiPercent
   * above, which is a reference-only figure unrelated to real invoice math
   * (see its own hint text). Empty = no override, falls back to the
   * product's category default, then the global 10%. Per the user's
   * request 2026-09-03.
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
  komisiBekasPercent: "",
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

/**
 * Reads Nama Produk + Ukuran P×L×T straight out of the photo's filename —
 * per the user's request 2026-08-30 ("mereka kerja per photo... nanti
 * nama filenya, dijadikan default di nama produk... ada ukuran, kamu
 * defaultkan juga itu ukuranya"). Verified as a real interactive demo
 * (the "HOJAY Shell — Foundry" mockup) before being wired in here.
 */
function parseProductFilename(filename: string): { name: string; dims: { p: string; l: string; t: string } | null } {
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
  /** Owner/Super Admin only — shows the Komisi Bekas override field. Per the user's request 2026-09-03. */
  isOwner?: boolean;
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

  // Bug found by the user 2026-09-05 ("komisi nominal tidak sesuai dengan
  // yang sedang diubah, harusnya tercalculate secara live"): this used to
  // read values.komisiPercent — the "Komisi — Persen" field TASK-014 just
  // removed from view. That field is still tracked internally (Hot
  // Products still needs it, see ProductForm's own TASK-014 comment
  // above), but it no longer changes when the user edits the one visible
  // commission field, so this display had gone stale/disconnected from
  // whatever was actually being typed. Recomputed to mirror the REAL
  // commission formula (lib/commission.ts's computeLineCommission) instead
  // of the old Hot-Products-only figure: for bekas, Harga Bottom × Komisi
  // Bekas% (the guaranteed floor-price commission — matches
  // maxDiskonBekas's own "base" term); for baru, the flat 6% of Harga
  // Rekomendasi (baru has no per-product override, so nothing to react to
  // there — this stays a static reference like before).
  const komisiNominal = useMemo(() => {
    const hargaRekomendasi = Number(values.hargaRekomendasi) || 0;
    if (values.kondisi === "bekas") {
      const hargaMinimum = Number(values.hargaMinimum) || 0;
      const pct = values.komisiBekasPercent ? Number(values.komisiBekasPercent) : DEFAULT_KOMISI_BEKAS_PERCENT;
      return Math.round((pct / 100) * hargaMinimum);
    }
    return Math.round((DEFAULT_KOMISI_BARU_PERCENT / 100) * hargaRekomendasi);
  }, [values.kondisi, values.komisiBekasPercent, values.hargaMinimum, values.hargaRekomendasi]);

  // Harga Modal — per the user's request 2026-08-25: no longer a manual
  // entry, always Harga Minimum ÷ 2. Still saved into the schema's
  // `hargaBeli` field (same "cost basis" concept the field already was).
  const hargaModal = useMemo(() => Math.round((Number(values.hargaMinimum) || 0) / 2), [values.hargaMinimum]);

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  // Autofill Nama Produk / Ukuran P×L×T from the photo's filename — never
  // overwrites a field the user already typed into by hand (checked per
  // field, not "any field filled"). Per the user's request 2026-08-30.
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
      // Both Komisi fields go through their own Owner-only endpoint, never
      // the general PATCH above (see komisi-bekas/route.ts's doc comment)
      // — a separate request, sent only when isOwner (the fields aren't
      // even visible otherwise, see the two Field blocks above). Runs
      // after the product itself is saved so a brand-new product (mode
      // "create") has a real _id to target.
      if (isOwner) {
        const saved = await res.json();
        const id = mode === "create" ? saved._id : productId;
        const komisiRes = await fetch(`/api/products/${id}/komisi-bekas`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            komisiPercent: Number(values.komisiPercent),
            // Only meaningful for bekas — sent as null (clears any stored
            // override) when kondisi isn't bekas, since the field wasn't
            // even shown to set one in the first place.
            komisiBekasPercent:
              values.kondisi === "bekas" && values.komisiBekasPercent ? Number(values.komisiBekasPercent) : null,
          }),
        });
        if (!komisiRes.ok) {
          const body = await komisiRes.json().catch(() => ({}));
          throw new Error(body.error || "Produk tersimpan, tapi Komisi gagal disimpan");
        }
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
    <FormCard
      className="max-w-3xl"
      title="Data Produk"
      description="Harga Modal & Komisi Nominal dihitung otomatis."
    >
      <form onSubmit={handleSubmit}>
        {/* Foto dipindah ke PALING ATAS — "mereka kerja per photo" (per
            the user's request 2026-08-30). Nama file di-parse untuk
            mengisi Nama Produk & Ukuran P×L×T otomatis, tapi cuma kalau
            field itu masih kosong — lihat parseProductFilename/
            handlePhotoSelected di atas. Verified as a real interactive
            demo (the "HOJAY Shell — Foundry" mockup) before landing here. */}
        <FormSection label="Foto Produk" compact>
          <UploadBox
            folder="products"
            value={values.fotoUrl}
            onChange={(url) => set("fotoUrl", url)}
            onFileSelected={handlePhotoSelected}
            hint="Tampil di Katalog, kartu produk, dan PDF katalog · JPG/PNG, maks 5MB"
          />
        </FormSection>

        {/* Dipadatkan (3 kolom, seksi lebih ringkas) — form ini diisi
            berkali-kali sehari, kecepatan lebih penting daripada napas
            visual lega. Per the user's request 2026-08-30. */}
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

        {/* Urutan alur yang benar-benar diketik user, berurutan: Harga
            Minimum -> Harga Rekomendasi -> Komisi %. Nilai otomatis
            (Harga Modal, Komisi Nominal) dipisah di bawah sebagai teks
            polos — bukan field/kotak lagi, supaya tidak terbaca seolah
            bisa diisi manual. Per koreksi user 2026-08-30. */}
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
            {/* Simplified to ONE visible commission field — per the user's
                report 2026-09-05 ("kenapa ada 2 untuk setting komisi %?
                dibuat satu kolom saja... ini membingungkan owner"). There
                used to be a separate "Komisi — Persen" input here too —
                it never actually drove real invoice commission (baru is
                always a hardcoded flat 6%, bekas uses komisiBekasPercent
                below), it only fed komisiNominal, which in turn feeds one
                of Dashboard's three "Hot Products" rankings (the
                "insentif" badge — see lib/dashboard.ts's getHotProducts).
                Removed as an editable field (explained this trade-off to
                the user before removing): komisiPercent still auto-tracks
                kondisi under the hood exactly as before (6% baru / 10%
                bekas, see setKondisi below), so komisiNominal/Hot Products
                keep working, just without manual per-product tuning of
                that one ranking. Owner/Super Admin only, same as before —
                the actual invoice-time bekas rate override (this really
                does drive computeLineCommission). Kosong = ikut default
                kategori lalu 10% global. Per the user's request 2026-09-03. */}
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
          {/* Komisi Nominal is derived straight from komisiPercent, same
              owner-only visibility — Harga Modal (cost basis, not
              commission) stays visible to everyone who can edit a
              product. */}
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
