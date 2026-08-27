"use client";

import { Fragment, useEffect, useState } from "react";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import { Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { RowActionButton } from "@/components/ui/RowAction";

interface CategoryRow {
  _id: string;
  name: string;
}

export default function CategoryManager() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline rename (2026-08-27, per the user's request "di kelola kategori
  // bisa hapus dan edit ya") — Hapus already existed, this fills in the
  // missing Edit. Same pattern as AccountManager's inline-edit-row.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/categories");
    setCategories(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Gagal menambah kategori");
    } else {
      setName("");
      await load();
    }
    setSaving(false);
  }

  async function removeCategory(id: string) {
    setCategories((prev) => prev.filter((c) => c._id !== id));
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
  }

  function startEdit(c: CategoryRow) {
    setEditingId(c._id);
    setEditName(c.name);
    setEditError(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editName.trim()) return;
    setEditSaving(true);
    setEditError(null);
    const res = await fetch(`/api/categories/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setEditError(body.error || "Gagal mengubah kategori");
    } else {
      setEditingId(null);
      await load();
    }
    setEditSaving(false);
  }

  return (
    <Panel>
      <PanelHead title="Kelola Kategori Produk">
        <form onSubmit={addCategory} className="flex gap-2.5">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama kategori baru..." />
          <Button type="submit" disabled={saving}>
            + Tambah
          </Button>
        </form>
      </PanelHead>
      {error && <div className="px-5 pt-3 font-mono text-[0.72rem] text-danger">{error}</div>}
      <TableScroll>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Nama Kategori
              </th>
              <th className="border-b border-line px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <Fragment key={c._id}>
                <tr className="hover:bg-[#fbfaf5]">
                  <td className="border-b border-line px-5 py-4.5 font-medium">{c.name}</td>
                  <td className="border-b border-line px-5 py-4.5">
                    <div className="flex flex-wrap gap-2">
                      <RowActionButton onClick={() => (editingId === c._id ? setEditingId(null) : startEdit(c))}>
                        {editingId === c._id ? "Batal" : "Ubah"}
                      </RowActionButton>
                      <RowActionButton onClick={() => removeCategory(c._id)}>Hapus</RowActionButton>
                    </div>
                  </td>
                </tr>
                {editingId === c._id && (
                  <tr>
                    <td colSpan={2} className="border-b border-line bg-[#f7f5ee] p-5">
                      <form onSubmit={saveEdit} className="flex flex-wrap items-center gap-2.5">
                        <Input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="max-w-xs"
                        />
                        <Button type="submit" disabled={editSaving}>
                          {editSaving ? "Menyimpan..." : "Simpan"}
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>
                          Batal
                        </Button>
                        {editError && <div className="font-mono text-[0.72rem] text-danger">{editError}</div>}
                      </form>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!loading && categories.length === 0 && (
              <tr>
                <td colSpan={2} className="px-5 py-8 text-center font-mono text-sm text-muted">
                  Belum ada kategori.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>
    </Panel>
  );
}
