"use client";

import { useEffect, useState } from "react";
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
              <tr key={c._id} className="hover:bg-[#fbfaf5]">
                <td className="border-b border-line px-5 py-4.5 font-medium">{c.name}</td>
                <td className="border-b border-line px-5 py-4.5">
                  <RowActionButton onClick={() => removeCategory(c._id)}>Hapus</RowActionButton>
                </td>
              </tr>
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
