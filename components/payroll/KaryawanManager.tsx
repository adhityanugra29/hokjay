"use client";

import { Fragment, useEffect, useState } from "react";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { RowActionButton } from "@/components/ui/RowAction";
import Pill from "@/components/ui/Pill";
import { rupiah } from "@/lib/format";

interface KaryawanRow {
  _id: string;
  nama: string;
  jabatan?: string;
  gajiHarian: number;
  aktif: boolean;
}

const BLANK = { nama: "", jabatan: "", gajiHarian: "" };

/** Roster CRUD for non-sales staff — see models/Karyawan.ts. Admin-only. */
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

  return (
    <Panel>
      <PanelHead title="Karyawan Non-Sales">
        <Button type="button" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Batal" : "+ Tambah Karyawan"}
        </Button>
      </PanelHead>

      {showForm && (
        <form onSubmit={addKaryawan} className="border-b-2 border-line p-5">
          <FormGrid>
            <Field label="Nama">
              <Input required value={values.nama} onChange={(e) => setValues((v) => ({ ...v, nama: e.target.value }))} />
            </Field>
            <Field label="Jabatan (opsional)">
              <Input value={values.jabatan} onChange={(e) => setValues((v) => ({ ...v, jabatan: e.target.value }))} placeholder="Contoh: Kurir, Admin Gudang" />
            </Field>
            <Field label="Gaji Harian" hint="Dikalikan jumlah hari hadir setiap bulan (lihat tab Absensi & Gaji Karyawan).">
              <Input required type="number" min={0} value={values.gajiHarian} onChange={(e) => setValues((v) => ({ ...v, gajiHarian: e.target.value }))} />
            </Field>
          </FormGrid>
          {error && <div className="mt-3 font-mono text-[0.75rem] text-danger">{error}</div>}
          <FormActions>
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </FormActions>
        </form>
      )}

      <TableScroll>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">Nama</th>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">Jabatan</th>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">Gaji Harian</th>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">Status</th>
              <th className="border-b border-line px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {karyawan.map((k) => (
              <Fragment key={k._id}>
                <tr className="hover:bg-[#fbfaf5]">
                  <td className="border-b border-line px-5 py-4.5 font-medium">{k.nama}</td>
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.78rem] text-muted">{k.jabatan || "—"}</td>
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{rupiah(k.gajiHarian)}</td>
                  <td className="border-b border-line px-5 py-4.5">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={k.aktif}
                        onChange={(e) => toggleAktif(k._id, e.target.checked)}
                        className="accent-accent"
                      />
                      {k.aktif ? <Pill variant="ok">Aktif</Pill> : <Pill variant="out">Nonaktif</Pill>}
                    </label>
                  </td>
                  <td className="border-b border-line px-5 py-4.5">
                    <div className="flex flex-wrap gap-2">
                      <RowActionButton onClick={() => (editingId === k._id ? setEditingId(null) : startEdit(k))}>
                        {editingId === k._id ? "Batal" : "Edit"}
                      </RowActionButton>
                      <RowActionButton onClick={() => removeKaryawan(k._id)}>Hapus</RowActionButton>
                    </div>
                  </td>
                </tr>
                {editingId === k._id && (
                  <tr>
                    <td colSpan={5} className="border-b border-line bg-[#f7f5ee] p-5">
                      <form onSubmit={handleEditSubmit}>
                        <FormGrid>
                          <Field label="Nama">
                            <Input required value={editValues.nama} onChange={(e) => setEditValues((v) => ({ ...v, nama: e.target.value }))} />
                          </Field>
                          <Field label="Jabatan">
                            <Input value={editValues.jabatan} onChange={(e) => setEditValues((v) => ({ ...v, jabatan: e.target.value }))} />
                          </Field>
                          <Field label="Gaji Harian">
                            <Input required type="number" min={0} value={editValues.gajiHarian} onChange={(e) => setEditValues((v) => ({ ...v, gajiHarian: e.target.value }))} />
                          </Field>
                        </FormGrid>
                        <FormActions>
                          <Button type="submit" disabled={editSaving}>
                            {editSaving ? "Menyimpan..." : "Simpan Perubahan"}
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>
                            Batal
                          </Button>
                        </FormActions>
                      </form>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!loading && karyawan.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center font-mono text-sm text-muted">
                  Belum ada karyawan non-sales tercatat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>
    </Panel>
  );
}
