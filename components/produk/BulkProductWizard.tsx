"use client";

import { useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Field, Input, Select, Textarea, CurrencyInput } from "@/components/ui/Form";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Button, LinkButton } from "@/components/ui/Button";
import { rupiah } from "@/lib/format";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { DEFAULT_KOMISI_BEKAS_PERCENT, DEFAULT_KOMISI_BARU_PERCENT } from "@/lib/commission";
import { parseProductFilename } from "./ProductForm";

/**
 * Tambah banyak produk dari foto: 1 foto = 1 produk, semua foto wajib diisi sampai tersimpan.
 * Antrean hidup di browser (bukan draft di DB: Product mewajibkan SKU/harga dan langsung tampil di Katalog);
 * tiap produk disimpan lewat POST /api/products yang sama dengan ProductForm.
 */

const STORAGE_KEY = "hojay.produkMassal.v1";
const MAX_PHOTOS = 30;
const MAX_BYTES = 5 * 1024 * 1024; // sama dengan batas /api/upload
const UPLOAD_CONCURRENCY = 3;

interface Values {
  name: string;
  merk: string;
  category: string;
  kondisi: "baru" | "bekas";
  tipeProduk: "elektronik" | "non-elektronik";
  stok: string;
  hargaMinimum: string;
  hargaRekomendasi: string;
  panjangCm: string;
  lebarCm: string;
  tinggiCm: string;
  ketebalan: string;
  dayaListrik: string;
  tanggalBarangMasuk: string;
  deskripsi: string;
}

type Status = "uploading" | "failed" | "pending" | "saved";

interface Item {
  id: string;
  fileName: string;
  fotoUrl: string;
  status: Status;
  error?: string;
  values: Values;
  /** true setelah form item ini pertama kali dibuka (nilai tiruan dari produk sebelumnya hanya diterapkan sekali). */
  opened: boolean;
  /** Kategori/Kondisi masih berupa tiruan dari produk sebelumnya (disorot kuning sampai diubah). */
  fromPrev: { category: boolean; kondisi: boolean };
  savedId?: string;
}

interface Carry {
  kondisi: "baru" | "bekas";
  category: string;
  tipeProduk: "elektronik" | "non-elektronik";
}

// Zona waktu WIB: toISOString() memberi tanggal UTC (salah sebelum jam 07.00).
function todayJakarta(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
}

function newValues(name: string, dims: { p: string; l: string; t: string } | null): Values {
  return {
    name,
    merk: "",
    category: "", // sengaja kosong & wajib dipilih: kategori salah tidak boleh tersimpan diam-diam
    kondisi: "bekas",
    tipeProduk: "non-elektronik",
    stok: "1",
    hargaMinimum: "",
    hargaRekomendasi: "",
    panjangCm: dims?.p ?? "",
    lebarCm: dims?.l ?? "",
    tinggiCm: dims?.t ?? "",
    ketebalan: "1mm",
    dayaListrik: "",
    tanggalBarangMasuk: todayJakarta(),
    deskripsi: "",
  };
}

function patchItem(list: Item[], id: string, patch: Partial<Item>): Item[] {
  return list.map((i) => (i.id === id ? { ...i, ...patch } : i));
}

function parseStored(raw: string | null): Item[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as { v?: number; items?: Item[] };
    if (data.v !== 1 || !Array.isArray(data.items)) return [];
    return data.items.filter((i) => i && i.fotoUrl && i.status === "pending");
  } catch {
    return [];
  }
}

const subscribeNoop = () => () => {};
const readStored = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

function Thumb({ url, className = "" }: { url: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt="" className={`object-cover ${className}`} /> : <div className={`bg-surface ${className}`} />;
}

export default function BulkProductWizard({ categories, isOwner }: { categories: string[]; isOwner: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  const [phase, setPhase] = useState<"pick" | "fill" | "done">("pick");
  const [curId, setCurId] = useState<string | null>(null);
  const [carry, setCarry] = useState<Carry | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pickNote, setPickNote] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [undo, setUndo] = useState<{ item: Item; index: number } | null>(null);
  const [, forceRender] = useReducer((n: number) => n + 1, 0);

  const filesRef = useRef(new Map<string, File>());
  const queueRef = useRef<string[]>([]);
  const activeRef = useRef(0);
  const interactedRef = useRef(false);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stored = useSyncExternalStore(subscribeNoop, readStored, () => null);
  const storedItems = useMemo(() => parseStored(stored), [stored]);

  const cur = items.find((i) => i.id === curId) ?? null;
  const pending = items.filter((i) => i.status === "pending");
  const saved = items.filter((i) => i.status === "saved");
  const uploadingCount = items.filter((i) => i.status === "uploading").length;
  const failedCount = items.filter((i) => i.status === "failed").length;

  // Simpan antrean yang belum terisi supaya bisa dilanjutkan bila tab tertutup.
  useEffect(() => {
    if (!interactedRef.current) return;
    try {
      const keep = items.filter((i) => i.status === "pending" && i.fotoUrl);
      if (keep.length) localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, items: keep }));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* penyimpanan penuh/diblokir: antrean tetap jalan tanpa pemulihan */
    }
  }, [items]);

  // Unggahan yang sedang berjalan hilang bila tab ditutup; sisanya sudah aman di penyimpanan.
  useEffect(() => {
    if (!uploadingCount) return;
    function warn(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uploadingCount]);

  // ---------- unggah ----------
  async function uploadOne(id: string) {
    const file = filesRef.current.get(id);
    if (!file) return;
    setItems((prev) => patchItem(prev, id, { status: "uploading", error: undefined }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "products");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal mengunggah foto");
      }
      const data = await res.json();
      filesRef.current.delete(id);
      setItems((prev) => patchItem(prev, id, { status: "pending", fotoUrl: data.url }));
    } catch (err) {
      setItems((prev) => patchItem(prev, id, { status: "failed", error: err instanceof Error ? err.message : "Gagal mengunggah foto" }));
    }
  }

  function pump() {
    while (activeRef.current < UPLOAD_CONCURRENCY && queueRef.current.length) {
      const id = queueRef.current.shift()!;
      activeRef.current++;
      uploadOne(id).finally(() => {
        activeRef.current--;
        pump();
      });
    }
  }

  function addFiles(list: FileList | File[]) {
    const all = Array.from(list);
    const images = all.filter((f) => f.type.startsWith("image/"));
    const room = Math.max(0, MAX_PHOTOS - items.length);
    const accepted = images.slice(0, room);
    const skipped = all.length - accepted.length;
    setPickNote(skipped ? `${skipped} file dilewati (bukan gambar, atau melebihi batas ${MAX_PHOTOS} foto).` : null);
    if (!accepted.length) return;

    interactedRef.current = true;
    const stamp = Date.now();
    const created: Item[] = accepted.map((file, n) => {
      const parsed = parseProductFilename(file.name);
      const tooBig = file.size > MAX_BYTES;
      const id = `${stamp}-${n}-${Math.random().toString(36).slice(2, 7)}`;
      if (!tooBig) filesRef.current.set(id, file);
      return {
        id,
        fileName: file.name,
        fotoUrl: "",
        status: tooBig ? "failed" : "uploading",
        error: tooBig ? "Ukuran file maksimal 5MB" : undefined,
        values: newValues(parsed.name.toUpperCase(), parsed.dims),
        opened: false,
        fromPrev: { category: false, kondisi: false },
      } satisfies Item;
    });
    setItems((prev) => [...prev, ...created]);
    queueRef.current.push(...created.filter((c) => c.status === "uploading").map((c) => c.id));
    pump();
  }

  function retry(id: string) {
    queueRef.current.push(id);
    pump();
  }

  function discard(id: string) {
    const index = items.findIndex((i) => i.id === id);
    if (index < 0) return;
    const item = items[index];
    filesRef.current.delete(id);
    queueRef.current = queueRef.current.filter((q) => q !== id);
    interactedRef.current = true;
    const rest = items.filter((i) => i.id !== id);
    setItems(rest);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    if (item.status === "pending") {
      setUndo({ item, index });
      undoTimer.current = setTimeout(() => setUndo(null), 6000);
    }
    if (phase === "fill" && curId === id) {
      const next = rest.slice(index).find((i) => i.status === "pending") ?? rest.find((i) => i.status === "pending");
      if (next) goTo(next.id);
      else setPhase(rest.some((i) => i.status === "saved") ? "done" : "pick");
    }
  }

  function undoDiscard() {
    if (!undo) return;
    const { item, index } = undo;
    setItems((prev) => [...prev.slice(0, index), item, ...prev.slice(index)]);
    setUndo(null);
    if (phase !== "pick") {
      setPhase("fill");
      goTo(item.id);
    }
  }

  // ---------- lanjutkan sesi sebelumnya ----------
  function resume() {
    interactedRef.current = true;
    setItems(storedItems);
    setPhase("fill");
    goTo(storedItems[0].id, null, storedItems);
  }

  function discardStored() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* diabaikan */
    }
    forceRender();
  }

  // ---------- isi data ----------
  function start() {
    const ready = items.filter((i) => i.status === "pending");
    if (!ready.length) return;
    setItems(ready); // foto yang gagal tidak ikut (tidak ada produk tanpa foto)
    setPhase("fill");
    goTo(ready[0].id, null, ready);
  }

  /** Buka form sebuah foto; Kategori/Kondisi/Tipe ditiru dari produk yang terakhir disimpan (sekali per foto). */
  function goTo(id: string, carryOverride: Carry | null | undefined = undefined, base?: Item[]) {
    const c = carryOverride === undefined ? carry : carryOverride;
    const apply = (list: Item[]) =>
      list.map((i) => {
        if (i.id !== id || i.opened) return i;
        const values = { ...i.values };
        const fromPrev = { category: false, kondisi: false };
        if (c) {
          values.category = c.category;
          values.kondisi = c.kondisi;
          values.tipeProduk = c.tipeProduk;
          fromPrev.category = !!c.category;
          fromPrev.kondisi = true;
        }
        return { ...i, opened: true, values, fromPrev };
      });
    if (base) setItems(apply(base));
    else setItems((prev) => apply(prev));
    setCurId(id);
    setFormError(null);
    setShowDetail(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  function setValue<K extends keyof Values>(key: K, value: Values[K]) {
    if (!cur) return;
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== cur.id) return i;
        const fromPrev = { ...i.fromPrev };
        if (key === "category") fromPrev.category = false;
        if (key === "kondisi") fromPrev.kondisi = false;
        return { ...i, values: { ...i.values, [key]: value }, fromPrev };
      })
    );
  }

  const v = cur?.values;
  const hargaMin = Number(v?.hargaMinimum) || 0;
  const hargaRek = Number(v?.hargaRekomendasi) || 0;
  const hargaModal = Math.round(hargaMin / 2); // aturan sama dengan ProductForm: Harga Modal = Harga Bottom ÷ 2
  const komisiNominal =
    v?.kondisi === "bekas"
      ? Math.round((DEFAULT_KOMISI_BEKAS_PERCENT / 100) * hargaMin)
      : Math.round((DEFAULT_KOMISI_BARU_PERCENT / 100) * hargaRek);
  const prevSaved = cur ? [...items.slice(0, items.findIndex((i) => i.id === cur.id))].reverse().find((i) => i.status === "saved") : undefined;
  const isLast = pending.length <= 1 && cur?.status === "pending";
  const position = cur ? items.findIndex((i) => i.id === cur.id) + 1 : 0;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !cur || !v) return;
    setFormError(null);

    if (!v.name.trim()) return setFormError("Nama Produk wajib diisi.");
    if (!categories.includes(v.category)) return setFormError("Pilih Kategori dari daftar yang ada.");
    if (!(Number(v.stok) >= 1)) return setFormError("Stok minimal 1.");
    if (!(hargaMin > 0)) return setFormError("Harga Bottom wajib diisi.");
    if (!(hargaRek > 0)) return setFormError("Harga Rekomendasi wajib diisi.");

    const payload = {
      name: v.name.trim(),
      merk: v.merk || undefined,
      category: v.category,
      kondisi: v.kondisi,
      tipeProduk: v.tipeProduk,
      hargaBeli: hargaModal,
      hargaRekomendasi: hargaRek,
      hargaMinimum: hargaMin,
      komisiPercent: v.kondisi === "bekas" ? DEFAULT_KOMISI_BEKAS_PERCENT : DEFAULT_KOMISI_BARU_PERCENT,
      stok: Number(v.stok),
      tanggalBarangMasuk: v.tanggalBarangMasuk ? new Date(v.tanggalBarangMasuk) : undefined,
      stokMinimum: LOW_STOCK_THRESHOLD,
      alertHariTidakTerjual: 45,
      dimensi:
        v.panjangCm || v.lebarCm || v.tinggiCm
          ? { panjangCm: Number(v.panjangCm) || undefined, lebarCm: Number(v.lebarCm) || undefined, tinggiCm: Number(v.tinggiCm) || undefined }
          : undefined,
      ketebalan: v.tipeProduk === "elektronik" ? undefined : v.ketebalan || undefined,
      dayaListrik: v.tipeProduk === "elektronik" ? v.dayaListrik || undefined : undefined,
      fotoUrl: cur.fotoUrl,
      deskripsi: v.deskripsi || undefined,
    };

    setSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal menyimpan produk");
      }
      const created = await res.json();
      const nextCarry: Carry = { kondisi: v.kondisi, category: v.category, tipeProduk: v.tipeProduk };
      setCarry(nextCarry);
      const updated = patchItem(items, cur.id, { status: "saved", savedId: created._id });
      setItems(updated);
      const idx = updated.findIndex((i) => i.id === cur.id);
      const rest = updated.filter((i) => i.status === "pending");
      if (!rest.length) {
        setPhase("done");
        window.scrollTo({ top: 0 });
      } else {
        const next = rest.find((i) => updated.indexOf(i) > idx) ?? rest[0];
        goTo(next.id, nextCarry, updated);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan produk");
    } finally {
      setSaving(false);
    }
  }

  // Enter = kolom berikut (bukan simpan); Ctrl+Enter = Simpan & berikutnya.
  function handleKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key !== "Enter") return;
    const t = e.target as HTMLElement;
    if (t.tagName === "TEXTAREA" || t.tagName === "BUTTON") return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
      return;
    }
    if (t.closest("[data-combobox]")) return; // SearchableSelect punya penanganan Enter sendiri
    e.preventDefault();
    const fields = Array.from(formRef.current?.querySelectorAll<HTMLElement>("input:not([type=hidden]):not([disabled]), select:not([disabled])") ?? []);
    const next = fields[fields.indexOf(t) + 1];
    (next ?? formRef.current?.querySelector<HTMLButtonElement>("button[type=submit]"))?.focus();
  }

  const stepCls = (n: number) => {
    const at = phase === "pick" ? 1 : phase === "fill" ? 2 : 3;
    return n === at ? "bg-ink text-white" : n < at ? "bg-surface text-ink" : "bg-surface text-muted";
  };

  // ---------- tampilan ----------
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5 font-sans text-[0.76rem] font-semibold">
        {["Pilih foto", "Isi data", "Selesai"].map((label, k) => (
          <span key={label} className={`rounded-full px-3 py-1 ${stepCls(k + 1)}`}>
            {k + 1} · {label}
          </span>
        ))}
      </div>

      {phase === "pick" && (
        <section>
          {items.length === 0 && storedItems.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-600 bg-accent-100 px-4 py-3 font-sans text-[0.82rem]">
              <span>
                <b>Ada {storedItems.length} foto yang belum diisi</b> dari sesi sebelumnya, tersimpan di perangkat ini.
              </span>
              <span className="flex gap-2">
                <Button type="button" onClick={resume} className="px-3 py-1.5 text-[0.76rem]">
                  Lanjutkan
                </Button>
                <Button type="button" variant="ghost" onClick={discardStored} className="px-3 py-1.5 text-[0.76rem]">
                  Buang
                </Button>
              </span>
            </div>
          )}

          <div className="mb-3 rounded-xl border border-accent-600 bg-accent-100 px-4 py-2.5 font-sans text-[0.78rem]">
            <b>1 foto = 1 produk.</b> Setiap foto yang diunggah wajib diisi datanya sampai tersimpan. Foto yang salah unggah bisa dibuang dengan tombol ✕. Foto boleh campur jenis barang.
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addFiles(e.dataTransfer.files);
            }}
            className="cursor-pointer rounded-2xl border-2 border-dashed border-line bg-panel px-5 py-9 text-center transition hover:border-accent-600 hover:bg-accent-100"
          >
            <div className="text-2xl">⇧</div>
            <div className="mt-1 font-sans text-[0.95rem] font-extrabold">Klik atau seret banyak foto ke sini</div>
            <div className="font-sans text-[0.72rem] text-muted">Maks {MAX_PHOTOS} foto · JPG/PNG/WEBP, 5MB per foto</div>
            <div className="font-sans text-[0.72rem] text-muted">
              Nama file dibaca otomatis: <b>Meja Kerja Stainless 120x60x80.jpg</b> → Nama + Ukuran
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
          {pickNote && <div className="mt-2 font-mono text-[0.72rem] text-danger">{pickNote}</div>}

          {items.length > 0 && (
            <>
              <div className="mt-5 mb-2 font-sans text-[0.8rem] font-bold">
                {items.length} foto{" "}
                <span className="font-medium text-muted">
                  · {pending.length} siap{uploadingCount ? `, ${uploadingCount} mengunggah` : ""}
                  {failedCount ? `, ${failedCount} gagal` : ""}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {items.map((it) => (
                  <div key={it.id} className="relative overflow-hidden rounded-xl border border-line bg-panel">
                    <Thumb url={it.fotoUrl} className="h-20 w-full" />
                    <button
                      type="button"
                      title="Buang foto ini"
                      onClick={() => discard(it.id)}
                      className="absolute top-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-full bg-panel/90 text-[0.8rem] font-extrabold hover:bg-danger hover:text-white"
                    >
                      ✕
                    </button>
                    <div className="p-2 font-sans text-[0.68rem]">
                      <div className="truncate font-bold">{it.fileName}</div>
                      <div className="mt-1">
                        {it.status === "uploading" && <span className="rounded-full bg-accent-100 px-2 py-0.5 font-bold text-accent-700">Mengunggah…</span>}
                        {it.status === "pending" && <span className="rounded-full bg-[#e6f3ea] px-2 py-0.5 font-bold text-[#2f7d4f]">Siap</span>}
                        {it.status === "failed" && (
                          <span className="flex items-center justify-between gap-1">
                            <span className="rounded-full bg-[#f9e3e0] px-2 py-0.5 font-bold text-danger">{it.error ?? "Gagal"}</span>
                            {filesRef.current.has(it.id) && (
                              <button type="button" onClick={() => retry(it.id)} className="font-bold underline">
                                Ulangi
                              </button>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="font-sans text-[0.72rem] text-muted">
              {pending.length} foto siap = {pending.length} produk yang harus diisi. Kategori &amp; Kondisi otomatis mengikuti produk sebelumnya.
              {failedCount > 0 && " Foto yang gagal tidak ikut."}
            </div>
            <Button type="button" disabled={!pending.length || uploadingCount > 0} onClick={start}>
              {uploadingCount > 0 ? "Menunggu unggahan…" : `Mulai isi data — ${pending.length} foto →`}
            </Button>
          </div>
        </section>
      )}

      {phase === "fill" && cur && v && (
        <section>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="font-sans text-[0.9rem] font-extrabold">
              Foto {position} dari {items.length}
              <span className="ml-2 font-medium text-muted">· {pending.length ? `${pending.length} foto belum diisi` : "semua terisi"}</span>
            </div>
            <div className="h-1.5 min-w-30 max-w-85 flex-1 overflow-hidden rounded-full bg-surface">
              <div className="h-full bg-[#2f7d4f] transition-all" style={{ width: `${(saved.length / Math.max(1, items.length)) * 100}%` }} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[340px_1fr] lg:items-start">
            <div className="overflow-hidden rounded-2xl border border-line bg-panel lg:sticky lg:top-4">
              <div className="grid h-24 place-items-center bg-surface lg:h-80">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cur.fotoUrl} alt="" className="h-full w-full object-contain" />
              </div>
              <div className="px-3.5 py-2.5 font-sans text-[0.72rem] text-muted">
                <b className="block truncate text-ink">{cur.fileName}</b>
                Foto Samping/Belakang ditambah lewat Edit Produk
              </div>
            </div>

            <form ref={formRef} onSubmit={handleSave} onKeyDown={handleKeyDown} className="rounded-2xl border border-line bg-panel">
              <div className="border-b border-line px-5 py-4">
                <div className="mb-2 font-mono text-[0.64rem] font-bold tracking-widest text-muted uppercase">Identitas</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Nama Produk" span2>
                    <Input required value={v.name} onChange={(e) => setValue("name", e.target.value)} placeholder="Contoh: Meja Kerja Stainless Steel 120cm" />
                  </Field>
                  <Field label="Kategori" hint={cur.fromPrev.category ? "Dari produk sebelumnya — ganti bila beda" : undefined}>
                    <div data-combobox className={cur.fromPrev.category ? "[&_input]:border-accent-600 [&_input]:bg-accent-100" : ""}>
                      <SearchableSelect
                        value={v.category}
                        onChange={(val) => setValue("category", val)}
                        options={categories}
                        placeholder="Pilih kategori…"
                        emptyLabel="Tidak ada kategori yang cocok."
                      />
                    </div>
                  </Field>
                  <Field label="Kondisi">
                    <Select
                      value={v.kondisi}
                      onChange={(e) => setValue("kondisi", e.target.value as "baru" | "bekas")}
                      className={cur.fromPrev.kondisi && carry ? "border-accent-600 bg-accent-100" : ""}
                    >
                      <option value="bekas">Bekas</option>
                      <option value="baru">Baru</option>
                    </Select>
                  </Field>
                  <Field label="Merk" hint="Opsional">
                    <Input value={v.merk} onChange={(e) => setValue("merk", e.target.value)} placeholder="Contoh: Getra" />
                  </Field>
                  <Field label="Stok">
                    <Input type="number" min={1} inputMode="numeric" value={v.stok} onChange={(e) => setValue("stok", e.target.value)} />
                  </Field>
                </div>
              </div>

              <div className="border-b border-line px-5 py-4">
                <div className="mb-2 font-mono text-[0.64rem] font-bold tracking-widest text-muted uppercase">Harga</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Harga Bottom" hint={v.kondisi === "bekas" ? "Dasar komisi bekas" : undefined}>
                    <CurrencyInput required value={v.hargaMinimum} onChange={(d) => setValue("hargaMinimum", d)} placeholder="0" />
                  </Field>
                  <Field label="Harga Rekomendasi">
                    <CurrencyInput required value={v.hargaRekomendasi} onChange={(d) => setValue("hargaRekomendasi", d)} placeholder="0" />
                  </Field>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 font-sans text-[0.74rem] text-muted">
                  <span>
                    Harga Modal <b className="font-medium text-ink">{rupiah(hargaModal)}</b>
                  </span>
                  {isOwner && (
                    <span>
                      Komisi Nominal <b className="font-medium text-ink">{rupiah(komisiNominal)}</b>
                    </span>
                  )}
                </div>
                {hargaMin > 0 && hargaRek > 0 && hargaRek < hargaMin && (
                  <div className="mt-2 font-sans text-[0.72rem] font-semibold text-danger">
                    ⚠ Harga Rekomendasi lebih rendah dari Harga Bottom — periksa lagi. Tetap bisa disimpan.
                  </div>
                )}
                {prevSaved && !v.hargaMinimum && !v.hargaRekomendasi && (
                  <button
                    type="button"
                    onClick={() => {
                      setValue("hargaMinimum", prevSaved.values.hargaMinimum);
                      setValue("hargaRekomendasi", prevSaved.values.hargaRekomendasi);
                    }}
                    className="mt-2 rounded-full border border-dashed border-accent-700 bg-accent-100 px-3 py-1 font-sans text-[0.7rem] font-bold hover:bg-accent"
                  >
                    ↺ Samakan harga dengan produk sebelumnya
                  </button>
                )}
              </div>

              <div className="border-b border-line px-5 py-4">
                <div className="mb-2 font-mono text-[0.64rem] font-bold tracking-widest text-muted uppercase">Ukuran &amp; Spesifikasi</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Ukuran P × L × T (cm)">
                    <div className="flex items-center gap-2">
                      {(["panjangCm", "lebarCm", "tinggiCm"] as const).map((k, n) => (
                        <div key={k} className="flex flex-1 items-center gap-2">
                          <Input
                            type="text"
                            inputMode="numeric"
                            maxLength={3}
                            placeholder="000"
                            value={v[k]}
                            onChange={(e) => setValue(k, e.target.value.replace(/\D/g, "").slice(0, 3))}
                            className="text-center"
                          />
                          {n < 2 && <span className="text-muted">×</span>}
                        </div>
                      ))}
                    </div>
                  </Field>
                  {v.tipeProduk !== "elektronik" ? (
                    <Field label="Ketebalan Material">
                      <Input value={v.ketebalan} onChange={(e) => setValue("ketebalan", e.target.value)} placeholder="Contoh: 1.2 mm" />
                    </Field>
                  ) : (
                    <Field label="Daya Listrik">
                      <Input value={v.dayaListrik} onChange={(e) => setValue("dayaListrik", e.target.value)} placeholder="Contoh: 1200 Watt" />
                    </Field>
                  )}
                </div>
              </div>

              <div className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5 font-sans text-[0.72rem] font-semibold">
                    <span className="rounded-full bg-surface px-2.5 py-0.5">{v.tipeProduk === "elektronik" ? "Elektronik" : "Non-Elektronik"}</span>
                    <span className="rounded-full bg-surface px-2.5 py-0.5">Masuk {v.tanggalBarangMasuk}</span>
                  </div>
                  <button type="button" onClick={() => setShowDetail((s) => !s)} className="font-sans text-[0.76rem] font-bold underline underline-offset-3">
                    {showDetail ? "Tutup ▴" : "Ubah ▾"}
                  </button>
                </div>
                {showDetail && (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Tipe Produk">
                      <Select value={v.tipeProduk} onChange={(e) => setValue("tipeProduk", e.target.value as "elektronik" | "non-elektronik")}>
                        <option value="non-elektronik">Non-Elektronik</option>
                        <option value="elektronik">Elektronik</option>
                      </Select>
                    </Field>
                    <Field label="Tgl. Barang Masuk">
                      <Input type="date" value={v.tanggalBarangMasuk} onChange={(e) => setValue("tanggalBarangMasuk", e.target.value)} />
                    </Field>
                    <Field label="Deskripsi" hint="Opsional, tampil di katalog" span2>
                      <Textarea rows={2} value={v.deskripsi} onChange={(e) => setValue("deskripsi", e.target.value)} />
                    </Field>
                  </div>
                )}
              </div>

              {formError && <div className="px-5 pb-3 font-mono text-[0.75rem] text-danger">{formError}</div>}

              <div className="sticky bottom-0 flex flex-wrap items-center gap-2 rounded-b-2xl border-t border-line bg-panel px-5 py-3">
                <Button type="submit" disabled={saving} className="flex-1 sm:flex-none">
                  {saving ? "Menyimpan…" : isLast ? "Simpan & selesai ✓" : "Simpan & berikutnya →"}
                </Button>
                <span className="hidden font-sans text-[0.68rem] text-muted sm:inline">Ctrl+Enter</span>
                <span className="flex-1" />
                <button
                  type="button"
                  onClick={() => discard(cur.id)}
                  className="px-2 py-2 font-sans text-[0.78rem] font-semibold text-danger hover:underline"
                >
                  Buang foto ini
                </button>
              </div>
            </form>
          </div>

          <div className="mt-4 rounded-2xl border border-line bg-panel p-2.5">
            <div className="flex gap-2 overflow-x-auto p-0.5">
              {items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  disabled={it.status === "saved"}
                  onClick={() => goTo(it.id)}
                  className={`relative w-16 flex-none rounded-xl border-2 p-0.5 text-center ${it.id === cur.id ? "border-ink bg-accent-100" : "border-transparent"}`}
                >
                  <Thumb url={it.fotoUrl} className="h-12 w-full rounded-lg" />
                  <span
                    className={`absolute -top-0.5 -right-0.5 grid h-4.5 w-4.5 place-items-center rounded-full border-2 border-panel text-[0.58rem] font-extrabold ${
                      it.status === "saved" ? "bg-[#2f7d4f] text-white" : "bg-accent text-ink"
                    }`}
                  >
                    {it.status === "saved" ? "✓" : ""}
                  </span>
                  <div className="mt-0.5 truncate font-sans text-[0.58rem] font-bold">{it.values.name || "—"}</div>
                  <div className="truncate font-sans text-[0.54rem] text-muted">{it.values.category || " "}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2 font-sans text-[0.72rem] text-muted">
            <b>Titik kuning</b> = foto belum diisi · <b>✓ hijau</b> = sudah tersimpan. Ringkasan terbuka setelah semua foto tersimpan. Enter pindah ke kolom berikut · Ctrl+Enter simpan &amp;
            berikutnya. Isian disimpan otomatis di perangkat ini.
          </div>
        </section>
      )}

      {phase === "done" && (
        <section className="mx-auto max-w-175">
          <div className="rounded-2xl border border-line bg-panel p-5 text-center">
            <div className="text-3xl">✓</div>
            <h2 className="my-1 font-sans text-[1.15rem] font-extrabold">Selesai</h2>
            <div className="font-sans text-[0.78rem] text-muted">Semua foto sudah menjadi produk dan tampil di Katalog.</div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {[
                ["Tersimpan", String(saved.length)],
                ["Total unit", String(saved.reduce((a, i) => a + (Number(i.values.stok) || 0), 0))],
                ["Nilai (Harga Rek.)", rupiah(saved.reduce((a, i) => a + (Number(i.values.hargaRekomendasi) || 0) * (Number(i.values.stok) || 0), 0))],
              ].map(([k, val]) => (
                <div key={k} className="min-w-28 rounded-xl bg-surface px-4 py-2.5">
                  <b className="block text-[1.2rem]">{val}</b>
                  <span className="font-sans text-[0.64rem] font-bold text-muted uppercase">{k}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-panel">
            {saved.map((it) => (
              <div key={it.id} className="flex items-center gap-2.5 border-b border-line px-3 py-2 last:border-b-0">
                <Thumb url={it.fotoUrl} className="h-9 w-9 flex-none rounded-lg" />
                <div className="min-w-0 flex-1 font-sans">
                  <b className="block truncate text-[0.8rem]">{it.values.name}</b>
                  <small className="text-[0.68rem] text-muted">
                    {it.values.kondisi === "baru" ? "Baru" : "Bekas"} · {it.values.category} · stok {it.values.stok} · Rek {rupiah(Number(it.values.hargaRekomendasi) || 0)}
                  </small>
                </div>
                {it.savedId && (
                  <Link href={`/produk/${it.savedId}`} className="font-sans text-[0.76rem] font-bold underline">
                    Edit
                  </Link>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <LinkButton href="/produk">Lihat Daftar Produk</LinkButton>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setItems([]);
                setCarry(null);
                setCurId(null);
                setPhase("pick");
              }}
            >
              Tambah batch lain
            </Button>
          </div>
        </section>
      )}

      {undo && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-xl bg-ink px-4 py-2.5 font-sans text-[0.8rem] text-white shadow-lg">
          <span>Foto dibuang</span>
          <button type="button" onClick={undoDiscard} className="font-extrabold text-accent">
            Urungkan
          </button>
        </div>
      )}
    </div>
  );
}
