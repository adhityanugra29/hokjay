"use client";

import { Fragment, useEffect, useState } from "react";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input, Textarea } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { RowActionButton } from "@/components/ui/RowAction";

interface SupplierRow {
  _id: string;
  namaUsaha: string;
  alamat: string;
  bank: string;
  nomorRekening: string;
  kontak?: string;
  catatan?: string;
}

const BLANK = { namaUsaha: "", alamat: "", bank: "", nomorRekening: "", kontak: "", catatan: "" };

/**
 * Supplier master data for Purchasing — bank/rekening are required so
 * Finance always knows where to transfer when paying a Tagihan Pembelian.
 * See confirmation with the user 2026-08-22.
 */
export default function SupplierManager() {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [values, setValues] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState(BLANK);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/suppliers");
    setSuppliers(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal menambah supplier");
      }
      setValues(BLANK);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah supplier");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(s: SupplierRow) {
    setEditingId(s._id);
    setEditValues({
      namaUsaha: s.namaUsaha,
      alamat: s.alamat,
      bank: s.bank,
      nomorRekening: s.nomorRekening,
      kontak: s.kontak ?? "",
      catatan: s.catatan ?? "",
    });
    setEditError(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/suppliers/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editValues),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal memperbarui supplier");
      }
      setEditingId(null);
      load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Gagal memperbarui supplier");
    } finally {
      setEditSaving(false);
    }
  }

  async function removeSupplier(id: string) {
    setSuppliers((prev) => prev.filter((s) => s._id !== id));
    await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
  }

  return (
    <Panel>
      <PanelHead title="Supplier">
        <Button type="button" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Batal" : "+ Tambah Supplier"}
        </Button>
      </PanelHead>

      {showForm && (
        <form onSubmit={handleSubmit} className="border-b-2 border-line p-5">
          <FormGrid>
            <Field label="Nama Usaha" span2>
              <Input
                required
                value={values.namaUsaha}
                onChange={(e) => setValues((v) => ({ ...v, namaUsaha: e.target.value }))}
                placeholder="Contoh: CV Logam Jaya"
              />
            </Field>
            <Field label="Alamat" span2>
              <Input
                required
                value={values.alamat}
                onChange={(e) => setValues((v) => ({ ...v, alamat: e.target.value }))}
              />
            </Field>
            <Field label="Bank">
              <Input required value={values.bank} onChange={(e) => setValues((v) => ({ ...v, bank: e.target.value }))} placeholder="Contoh: BCA" />
            </Field>
            <Field label="Nomor Rekening">
              <Input
                required
                value={values.nomorRekening}
                onChange={(e) => setValues((v) => ({ ...v, nomorRekening: e.target.value }))}
              />
            </Field>
            <Field label="Kontak (opsional)">
              <Input value={values.kontak} onChange={(e) => setValues((v) => ({ ...v, kontak: e.target.value }))} placeholder="No. WhatsApp" />
            </Field>
            <Field label="Catatan (opsional)" span2>
              <Textarea rows={2} value={values.catatan} onChange={(e) => setValues((v) => ({ ...v, catatan: e.target.value }))} />
            </Field>
          </FormGrid>
          {error && <div className="mt-3 font-mono text-[0.75rem] text-danger">{error}</div>}
          <FormActions>
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Supplier"}
            </Button>
          </FormActions>
        </form>
      )}

      <TableScroll>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Nama Usaha
              </th>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Alamat
              </th>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Bank
              </th>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                No. Rekening
              </th>
              <th className="border-b border-line px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <Fragment key={s._id}>
                <tr className="hover:bg-[#fbfaf5]">
                  <td className="border-b border-line px-5 py-4.5 font-medium">{s.namaUsaha}</td>
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.75rem] text-muted">{s.alamat}</td>
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{s.bank}</td>
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{s.nomorRekening}</td>
                  <td className="border-b border-line px-5 py-4.5">
                    <div className="flex flex-wrap gap-2">
                      <RowActionButton onClick={() => (editingId === s._id ? setEditingId(null) : startEdit(s))}>
                        {editingId === s._id ? "Batal" : "Edit"}
                      </RowActionButton>
                      <RowActionButton onClick={() => removeSupplier(s._id)}>Hapus</RowActionButton>
                    </div>
                  </td>
                </tr>
                {editingId === s._id && (
                  <tr>
                    <td colSpan={5} className="border-b border-line bg-[#f7f5ee] p-5">
                      <form onSubmit={handleEditSubmit}>
                        <FormGrid>
                          <Field label="Nama Usaha" span2>
                            <Input
                              required
                              value={editValues.namaUsaha}
                              onChange={(e) => setEditValues((v) => ({ ...v, namaUsaha: e.target.value }))}
                            />
                          </Field>
                          <Field label="Alamat" span2>
                            <Input
                              required
                              value={editValues.alamat}
                              onChange={(e) => setEditValues((v) => ({ ...v, alamat: e.target.value }))}
                            />
                          </Field>
                          <Field label="Bank">
                            <Input required value={editValues.bank} onChange={(e) => setEditValues((v) => ({ ...v, bank: e.target.value }))} />
                          </Field>
                          <Field label="Nomor Rekening">
                            <Input
                              required
                              value={editValues.nomorRekening}
                              onChange={(e) => setEditValues((v) => ({ ...v, nomorRekening: e.target.value }))}
                            />
                          </Field>
                          <Field label="Kontak (opsional)">
                            <Input value={editValues.kontak} onChange={(e) => setEditValues((v) => ({ ...v, kontak: e.target.value }))} />
                          </Field>
                          <Field label="Catatan (opsional)" span2>
                            <Textarea rows={2} value={editValues.catatan} onChange={(e) => setEditValues((v) => ({ ...v, catatan: e.target.value }))} />
                          </Field>
                        </FormGrid>
                        {editError && <div className="mt-3 font-mono text-[0.75rem] text-danger">{editError}</div>}
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
            {!loading && suppliers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center font-mono text-sm text-muted">
                  Belum ada supplier. Contoh: &quot;CV Logam Jaya&quot; — BCA 1234567890.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>
    </Panel>
  );
}
