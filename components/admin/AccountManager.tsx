"use client";

import { Fragment, useEffect, useState } from "react";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input, Select } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { RowActionButton } from "@/components/ui/RowAction";
import Pill from "@/components/ui/Pill";
import type { UserRole } from "@/models/User";

interface AccountRow {
  _id: string;
  nama: string;
  email: string;
  role: UserRole;
  aktif: boolean;
}

export default function AccountManager() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [values, setValues] = useState({ nama: "", email: "", password: "", role: "sales" as UserRole });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ nama: "", email: "", password: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/users");
    setAccounts(await res.json());
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
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal membuat akun");
      }
      setValues({ nama: "", email: "", password: "", role: "sales" });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat akun");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAktif(id: string, aktif: boolean) {
    setAccounts((prev) => prev.map((a) => (a._id === id ? { ...a, aktif } : a)));
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aktif }),
    });
  }

  async function changeRole(id: string, role: UserRole) {
    setAccounts((prev) => prev.map((a) => (a._id === id ? { ...a, role } : a)));
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
  }

  async function removeAccount(id: string) {
    setAccounts((prev) => prev.filter((a) => a._id !== id));
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
  }

  function startEdit(a: AccountRow) {
    setEditingId(a._id);
    setEditValues({ nama: a.nama, email: a.email, password: "" });
    setEditError(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/admin/users/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: editValues.nama,
          email: editValues.email,
          password: editValues.password || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal memperbarui akun");
      }
      setEditingId(null);
      load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Gagal memperbarui akun");
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <Panel>
      <PanelHead title="Akun login staff">
        <Button type="button" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Batal" : "+ Tambah Akun"}
        </Button>
      </PanelHead>

      {showForm && (
        <form onSubmit={handleSubmit} className="border-b-2 border-line p-5">
          <FormGrid>
            <Field label="Nama">
              <Input required value={values.nama} onChange={(e) => setValues((v) => ({ ...v, nama: e.target.value }))} />
            </Field>
            <Field label="Email">
              <Input
                required
                type="email"
                value={values.email}
                onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
                placeholder="nama@horecajaya.id"
              />
            </Field>
            <Field label="Password" hint="Minimal 6 karakter">
              <Input
                required
                type="password"
                value={values.password}
                onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
              />
            </Field>
            <Field label="Role">
              <Select value={values.role} onChange={(e) => setValues((v) => ({ ...v, role: e.target.value as UserRole }))}>
                <option value="sales">Sales</option>
                <option value="finance">Finance</option>
                <option value="admin">Admin</option>
              </Select>
            </Field>
          </FormGrid>
          {error && <div className="mt-3 font-mono text-[0.75rem] text-danger">{error}</div>}
          <FormActions>
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Akun"}
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
                Email
              </th>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Role
              </th>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Status
              </th>
              <th className="border-b border-line px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <Fragment key={a._id}>
                <tr className="hover:bg-[#fbfaf5]">
                  <td className="border-b border-line px-5 py-4.5 font-medium">{a.nama}</td>
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{a.email}</td>
                  <td className="border-b border-line px-5 py-4.5">
                    <select
                      value={a.role}
                      onChange={(e) => changeRole(a._id, e.target.value as UserRole)}
                      className="border border-line bg-panel px-2 py-1.5 font-sans text-[0.78rem]"
                    >
                      <option value="sales">Sales</option>
                      <option value="finance">Finance</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="border-b border-line px-5 py-4.5">
                    <button type="button" onClick={() => toggleAktif(a._id, !a.aktif)} className="cursor-pointer">
                      <Pill variant={a.aktif ? "paid" : "unpaid"}>{a.aktif ? "Aktif" : "Nonaktif"}</Pill>
                    </button>
                  </td>
                  <td className="border-b border-line px-5 py-4.5">
                    <div className="flex flex-wrap gap-2">
                      <RowActionButton onClick={() => (editingId === a._id ? setEditingId(null) : startEdit(a))}>
                        {editingId === a._id ? "Batal" : "Edit"}
                      </RowActionButton>
                      <RowActionButton onClick={() => removeAccount(a._id)}>Hapus</RowActionButton>
                    </div>
                  </td>
                </tr>
                {editingId === a._id && (
                  <tr>
                    <td colSpan={5} className="border-b border-line bg-[#f7f5ee] p-5">
                      <form onSubmit={handleEditSubmit}>
                        <FormGrid>
                          <Field label="Nama">
                            <Input
                              required
                              value={editValues.nama}
                              onChange={(e) => setEditValues((v) => ({ ...v, nama: e.target.value }))}
                            />
                          </Field>
                          <Field label="Email">
                            <Input
                              required
                              type="email"
                              value={editValues.email}
                              onChange={(e) => setEditValues((v) => ({ ...v, email: e.target.value }))}
                            />
                          </Field>
                          <Field label="Password Baru" hint="Kosongkan kalau tidak mau ganti password">
                            <Input
                              type="password"
                              value={editValues.password}
                              onChange={(e) => setEditValues((v) => ({ ...v, password: e.target.value }))}
                              placeholder="••••••••"
                            />
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
            {!loading && accounts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center font-mono text-sm text-muted">
                  Belum ada akun login.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>
    </Panel>
  );
}
