"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Form";
import { Avatar, PaySwitch, chipCls } from "@/components/payroll/ui";
import { rupiah } from "@/lib/format";

interface KaryawanRow {
  _id: string;
  nama: string;
  jabatan?: string;
  gajiHarian: number;
  aktif: boolean;
}

const BLANK = { nama: "", jabatan: "", gajiHarian: "" };

const labelCls = "mb-1 block font-sans text-[11.5px] font-bold text-muted";
const primaryBtnCls =
  "inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-full border border-accent bg-accent px-5 font-sans text-[0.85rem] font-extrabold text-ink transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50";
const ghostBtnCls =
  "inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-full border border-line px-5 font-sans text-[0.85rem] font-bold text-ink transition hover:bg-surface";

/**
 * Roster CRUD for non-sales staff — see models/Karyawan.ts. Admin-only.
 * Redesigned 2026-10-01 to match the rest of Payroll (mockup-approved): rounded
 * cards instead of a table, Aktif as a switch, Edit/Hapus as pill buttons, the
 * add/edit forms open under the row. Behavior unchanged (Hapus still deletes
 * straight away, as before). No month stepper here — a roster has no period.
 */
export default function KaryawanManager() {
  const [karyawan, setKaryawan] = useState<KaryawanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [values, setValues] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState(BLANK);
  const [editSaving, setEditSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/karyawan");
    setKaryawan(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addKaryawan(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!values.nama.trim()) return setError("Nama wajib diisi.");
    if (!(Number(values.gajiHarian) > 0)) return setError("Gaji harian harus lebih dari 0.");
    setSaving(true);
    try {
      const res = await fetch("/api/karyawan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, gajiHarian: Number(values.gajiHarian) }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || "Gagal menambah karyawan");
      }
      setValues(BLANK);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah karyawan");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAktif(id: string, aktif: boolean) {
    setKaryawan((prev) => prev.map((k) => (k._id === id ? { ...k, aktif } : k)));
    await fetch(`/api/karyawan/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aktif }),
    });
  }

  function startEdit(k: KaryawanRow) {
    setEditingId(k._id);
    setEditValues({ nama: k.nama, jabatan: k.jabatan ?? "", gajiHarian: String(k.gajiHarian) });
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditSaving(true);
    await fetch(`/api/karyawan/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editValues, gajiHarian: Number(editValues.gajiHarian) }),
    });
    setEditingId(null);
    setEditSaving(false);
    load();
  }

  async function removeKaryawan(id: string) {
    setKaryawan((prev) => prev.filter((k) => k._id !== id));
    await fetch(`/api/karyawan/${id}`, { method: "DELETE" });
  }

  const aktifCount = karyawan.filter((k) => k.aktif).length;

  return (
    <section className="min-w-0 rounded-2xl bg-panel shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-2 pt-3.5 md:px-5">
        <div>
          <h2 className="font-sans text-[0.98rem] font-extrabold">Karyawan non-sales</h2>
          <div className="font-sans text-[12px] text-muted">
            {karyawan.length} karyawan · {aktifCount} aktif
          </div>
        </div>
        <button type="button" className={primaryBtnCls} onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Batal" : "+ Tambah karyawan"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={addKaryawan} className="mx-4 mb-2 rounded-2xl bg-surface p-4 md:mx-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="kar-nama" className={labelCls}>
                Nama
              </label>
              <Input id="kar-nama" required value={values.nama} onChange={(e) => setValues((v) => ({ ...v, nama: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="kar-jabatan" className={labelCls}>
                Jabatan (opsional)
              </label>
              <Input
                id="kar-jabatan"
                value={values.jabatan}
                onChange={(e) => setValues((v) => ({ ...v, jabatan: e.target.value }))}
                placeholder="Contoh: Kurir, Admin Gudang"
              />
            </div>
            <div>
              <label htmlFor="kar-gaji" className={labelCls}>
                Gaji harian
              </label>
              <Input
                id="kar-gaji"
                required
                type="number"
                min={0}
                value={values.gajiHarian}
                onChange={(e) => setValues((v) => ({ ...v, gajiHarian: e.target.value }))}
              />
              <div className="mt-1 font-sans text-[11px] text-muted">
                Dikalikan jumlah hari hadir setiap bulan (lihat tab Absensi &amp; Gaji).
              </div>
            </div>
          </div>
          {error && <div className="mt-3 font-sans text-[0.78rem] text-danger">{error}</div>}
          <div className="mt-3.5 flex flex-wrap gap-2">
            <button type="submit" disabled={saving} className={primaryBtnCls}>
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
            <button type="button" className={ghostBtnCls} onClick={() => setShowForm(false)}>
              Batal
            </button>
          </div>
        </form>
      )}

      <div className="px-4 pb-2 md:px-5">
        {karyawan.map((k) => (
          <div key={k._id} className="flex flex-col gap-2.5 border-t border-line py-3.5 first:border-t-0">
            <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[40px_minmax(0,1fr)_auto_auto]">
              <Avatar nama={k.nama} className={k.aktif ? "" : "opacity-55"} />
              <div className={`flex min-w-0 flex-col gap-0.5 ${k.aktif ? "" : "opacity-55"}`}>
                <b className="font-sans text-[0.92rem] font-extrabold wrap-anywhere">{k.nama}</b>
                <span className="font-sans text-[11.5px] text-muted">
                  {k.jabatan || "Tanpa jabatan"} · <b className="text-ink">{rupiah(k.gajiHarian)}</b> per hari
                </span>
              </div>
              <PaySwitch checked={k.aktif} onChange={(v) => toggleAktif(k._id, v)} label={`Status ${k.nama}`} />
              <span className={`hidden w-[62px] text-right font-sans text-[12px] font-extrabold sm:block ${k.aktif ? "text-[#087a52]" : "text-muted"}`}>
                {k.aktif ? "Aktif" : "Nonaktif"}
              </span>
            </div>
            <div className="flex gap-1.5 pl-[52px]">
              <button type="button" className={chipCls} onClick={() => (editingId === k._id ? setEditingId(null) : startEdit(k))}>
                {editingId === k._id ? "Batal" : "Edit"}
              </button>
              <button type="button" className={`${chipCls} text-danger`} onClick={() => removeKaryawan(k._id)}>
                Hapus
              </button>
            </div>
            {editingId === k._id && (
              <form onSubmit={handleEditSubmit} className="rounded-2xl bg-surface p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label htmlFor={`edit-nama-${k._id}`} className={labelCls}>
                      Nama
                    </label>
                    <Input
                      id={`edit-nama-${k._id}`}
                      required
                      value={editValues.nama}
                      onChange={(e) => setEditValues((v) => ({ ...v, nama: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor={`edit-jabatan-${k._id}`} className={labelCls}>
                      Jabatan
                    </label>
                    <Input
                      id={`edit-jabatan-${k._id}`}
                      value={editValues.jabatan}
                      onChange={(e) => setEditValues((v) => ({ ...v, jabatan: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor={`edit-gaji-${k._id}`} className={labelCls}>
                      Gaji harian
                    </label>
                    <Input
                      id={`edit-gaji-${k._id}`}
                      required
                      type="number"
                      min={0}
                      value={editValues.gajiHarian}
                      onChange={(e) => setEditValues((v) => ({ ...v, gajiHarian: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  <button type="submit" disabled={editSaving} className={primaryBtnCls}>
                    {editSaving ? "Menyimpan..." : "Simpan perubahan"}
                  </button>
                  <button type="button" className={ghostBtnCls} onClick={() => setEditingId(null)}>
                    Batal
                  </button>
                </div>
              </form>
            )}
          </div>
        ))}
        {!loading && karyawan.length === 0 && (
          <div className="py-8 text-center font-sans text-[0.85rem] text-muted">Belum ada karyawan non-sales tercatat.</div>
        )}
      </div>
    </section>
  );
}
