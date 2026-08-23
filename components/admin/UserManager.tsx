"use client";

import { Fragment, useEffect, useState } from "react";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input, Select } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { RowActionButton } from "@/components/ui/RowAction";
import Pill from "@/components/ui/Pill";
import { rupiah } from "@/lib/format";

interface SalesRow {
  _id: string;
  nama: string;
  aktif: boolean;
  bank?: string;
  nomorRekening?: string;
  rekeningTerverifikasi?: boolean;
  statusKepegawaian?: "tetap" | "freelance";
  gajiPokok?: number;
  targetBulanan?: number;
}

const BLANK = {
  nama: "",
  bank: "",
  nomorRekening: "",
  statusKepegawaian: "freelance" as "tetap" | "freelance",
  gajiPokok: "",
  targetBulanan: "",
};

/**
 * Manages the "Sales" collection — the closest thing this no-login app has
 * to user accounts (staff assigned to invoices, ranked in Insentif Sales).
 * Bank/rekening fields (added 2026-08-22) power the /bayar-komisi payout
 * sheet's "Rekening" column and verified/unverified status.
 */
export default function UserManager() {
  const [sales, setSales] = useState<SalesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [values, setValues] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    nama: "",
    bank: "",
    nomorRekening: "",
    statusKepegawaian: "freelance" as "tetap" | "freelance",
    gajiPokok: "",
    targetBulanan: "",
  });
  const [editSaving, setEditSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/sales");
    setSales(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addSales(e: React.FormEvent) {
    e.preventDefault();
    if (!values.nama.trim()) return;
    setSaving(true);
    await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        gajiPokok: Number(values.gajiPokok) || 0,
        targetBulanan: Number(values.targetBulanan) || 0,
      }),
    });
    setValues(BLANK);
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function toggleAktif(id: string, aktif: boolean) {
    setSales((prev) => prev.map((s) => (s._id === id ? { ...s, aktif } : s)));
    await fetch(`/api/sales/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aktif }),
    });
  }

  async function toggleVerified(id: string, rekeningTerverifikasi: boolean) {
    setSales((prev) => prev.map((s) => (s._id === id ? { ...s, rekeningTerverifikasi } : s)));
    await fetch(`/api/sales/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rekeningTerverifikasi }),
    });
  }

  function startEdit(s: SalesRow) {
    setEditingId(s._id);
    setEditValues({
      nama: s.nama,
      bank: s.bank ?? "",
      nomorRekening: s.nomorRekening ?? "",
      statusKepegawaian: s.statusKepegawaian ?? "freelance",
      gajiPokok: s.gajiPokok ? String(s.gajiPokok) : "",
      targetBulanan: s.targetBulanan ? String(s.targetBulanan) : "",
    });
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditSaving(true);
    await fetch(`/api/sales/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editValues,
        gajiPokok: Number(editValues.gajiPokok) || 0,
        targetBulanan: Number(editValues.targetBulanan) || 0,
      }),
    });
    setEditingId(null);
    setEditSaving(false);
    load();
  }

  async function removeSales(id: string) {
    setSales((prev) => prev.filter((s) => s._id !== id));
    await fetch(`/api/sales/${id}`, { method: "DELETE" });
  }

  return (
    <Panel>
      <PanelHead title="Kelola User (Sales)">
        <Button type="button" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Batal" : "+ Tambah"}
        </Button>
      </PanelHead>

      {showForm && (
        <form onSubmit={addSales} className="border-b-2 border-line p-5">
          <FormGrid>
            <Field label="Nama">
              <Input required value={values.nama} onChange={(e) => setValues((v) => ({ ...v, nama: e.target.value }))} />
            </Field>
            <Field label="Bank (opsional)">
              <Input value={values.bank} onChange={(e) => setValues((v) => ({ ...v, bank: e.target.value }))} placeholder="Contoh: BCA" />
            </Field>
            <Field label="Nomor Rekening (opsional)">
              <Input value={values.nomorRekening} onChange={(e) => setValues((v) => ({ ...v, nomorRekening: e.target.value }))} />
            </Field>
            <Field label="Status Kepegawaian" hint="Menentukan apakah sales ini dapat gaji pokok bulanan lewat Payroll.">
              <Select
                value={values.statusKepegawaian}
                onChange={(e) => setValues((v) => ({ ...v, statusKepegawaian: e.target.value as "tetap" | "freelance" }))}
              >
                <option value="freelance">Freelance (komisi saja)</option>
                <option value="tetap">Tetap (gaji pokok + komisi)</option>
              </Select>
            </Field>
            {values.statusKepegawaian === "tetap" && (
              <Field label="Gaji Pokok / Bulan">
                <Input
                  type="number"
                  min={0}
                  value={values.gajiPokok}
                  onChange={(e) => setValues((v) => ({ ...v, gajiPokok: e.target.value }))}
                />
              </Field>
            )}
            <Field label="Target Penjualan / Bulan (opsional)" hint="Untuk papan Leaderboard Sales — kosongkan kalau belum ada target.">
              <Input
                type="number"
                min={0}
                value={values.targetBulanan}
                onChange={(e) => setValues((v) => ({ ...v, targetBulanan: e.target.value }))}
              />
            </Field>
          </FormGrid>
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
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Nama
              </th>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Rekening
              </th>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Terverifikasi
              </th>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Kepegawaian
              </th>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Target/Bln
              </th>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Status
              </th>
              <th className="border-b border-line px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <Fragment key={s._id}>
                <tr className="hover:bg-[#fbfaf5]">
                  <td className="border-b border-line px-5 py-4.5 font-medium">{s.nama}</td>
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.75rem] text-muted">
                    {s.bank ? `${s.bank} · ${s.nomorRekening}` : "—"}
                  </td>
                  <td className="border-b border-line px-5 py-4.5">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!s.rekeningTerverifikasi}
                        disabled={!s.bank}
                        onChange={(e) => toggleVerified(s._id, e.target.checked)}
                        className="accent-accent"
                      />
                      {s.rekeningTerverifikasi ? <Pill variant="ok">Terverifikasi</Pill> : <Pill variant="unpaid">Belum</Pill>}
                    </label>
                  </td>
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.75rem]">
                    {s.statusKepegawaian === "tetap" ? (
                      <>
                        <Pill variant="ok">Tetap</Pill>
                        <div className="mt-1 text-muted">{rupiah(s.gajiPokok ?? 0)}/bln</div>
                      </>
                    ) : (
                      <span className="text-muted">Freelance</span>
                    )}
                  </td>
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.75rem] text-muted">
                    {s.targetBulanan ? rupiah(s.targetBulanan) : "—"}
                  </td>
                  <td className="border-b border-line px-5 py-4.5">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={s.aktif}
                        onChange={(e) => toggleAktif(s._id, e.target.checked)}
                        className="accent-accent"
                      />
                      {s.aktif ? <Pill variant="ok">Aktif</Pill> : <Pill variant="out">Nonaktif</Pill>}
                    </label>
                  </td>
                  <td className="border-b border-line px-5 py-4.5">
                    <div className="flex flex-wrap gap-2">
                      <RowActionButton onClick={() => (editingId === s._id ? setEditingId(null) : startEdit(s))}>
                        {editingId === s._id ? "Batal" : "Edit"}
                      </RowActionButton>
                      <RowActionButton onClick={() => removeSales(s._id)}>Hapus</RowActionButton>
                    </div>
                  </td>
                </tr>
                {editingId === s._id && (
                  <tr>
                    <td colSpan={7} className="border-b border-line bg-[#f7f5ee] p-5">
                      <form onSubmit={handleEditSubmit}>
                        <FormGrid>
                          <Field label="Nama">
                            <Input required value={editValues.nama} onChange={(e) => setEditValues((v) => ({ ...v, nama: e.target.value }))} />
                          </Field>
                          <Field label="Bank">
                            <Input value={editValues.bank} onChange={(e) => setEditValues((v) => ({ ...v, bank: e.target.value }))} />
                          </Field>
                          <Field label="Nomor Rekening">
                            <Input value={editValues.nomorRekening} onChange={(e) => setEditValues((v) => ({ ...v, nomorRekening: e.target.value }))} />
                          </Field>
                          <Field label="Status Kepegawaian">
                            <Select
                              value={editValues.statusKepegawaian}
                              onChange={(e) => setEditValues((v) => ({ ...v, statusKepegawaian: e.target.value as "tetap" | "freelance" }))}
                            >
                              <option value="freelance">Freelance (komisi saja)</option>
                              <option value="tetap">Tetap (gaji pokok + komisi)</option>
                            </Select>
                          </Field>
                          {editValues.statusKepegawaian === "tetap" && (
                            <Field label="Gaji Pokok / Bulan">
                              <Input
                                type="number"
                                min={0}
                                value={editValues.gajiPokok}
                                onChange={(e) => setEditValues((v) => ({ ...v, gajiPokok: e.target.value }))}
                              />
                            </Field>
                          )}
                          <Field label="Target Penjualan / Bulan (opsional)">
                            <Input
                              type="number"
                              min={0}
                              value={editValues.targetBulanan}
                              onChange={(e) => setEditValues((v) => ({ ...v, targetBulanan: e.target.value }))}
                            />
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
            {!loading && sales.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center font-mono text-sm text-muted">
                  Belum ada user/sales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>
    </Panel>
  );
}
