"use client";

import { useEffect, useState } from "react";
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

const ROLE_LABEL: Record<UserRole, string> = { sales: "Sales", finance: "Finance", admin: "Admin" };

export default function AccountManager() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [values, setValues] = useState({ nama: "", email: "", password: "", role: "sales" as UserRole });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
              <tr key={a._id} className="hover:bg-[#fbfaf5]">
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
                  <RowActionButton onClick={() => removeAccount(a._id)}>Hapus</RowActionButton>
                </td>
              </tr>
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
