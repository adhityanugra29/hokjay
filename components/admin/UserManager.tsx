"use client";

import { useEffect, useState } from "react";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import { Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { RowActionButton } from "@/components/ui/RowAction";
import Pill from "@/components/ui/Pill";

interface SalesRow {
  _id: string;
  nama: string;
  aktif: boolean;
}

/**
 * Manages the "Sales" collection — the closest thing this no-login app has
 * to user accounts (staff assigned to invoices, ranked in Insentif Sales).
 */
export default function UserManager() {
  const [sales, setSales] = useState<SalesRow[]>([]);
  const [nama, setNama] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    if (!nama.trim()) return;
    setSaving(true);
    await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama }),
    });
    setNama("");
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

  async function removeSales(id: string) {
    setSales((prev) => prev.filter((s) => s._id !== id));
    await fetch(`/api/sales/${id}`, { method: "DELETE" });
  }

  return (
    <Panel>
      <PanelHead title="Kelola User (Sales)">
        <form onSubmit={addSales} className="flex gap-2.5">
          <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama user/sales baru..." />
          <Button type="submit" disabled={saving}>
            + Tambah
          </Button>
        </form>
      </PanelHead>
      <TableScroll>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Nama
              </th>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Status
              </th>
              <th className="border-b border-line px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s._id} className="hover:bg-[#fbfaf5]">
                <td className="border-b border-line px-5 py-4.5 font-medium">{s.nama}</td>
                <td className="border-b border-line px-5 py-4.5">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={s.aktif}
                      onChange={(e) => toggleAktif(s._id, e.target.checked)}
                      className="accent-moss"
                    />
                    {s.aktif ? <Pill variant="ok">Aktif</Pill> : <Pill variant="out">Nonaktif</Pill>}
                  </label>
                </td>
                <td className="border-b border-line px-5 py-4.5">
                  <RowActionButton onClick={() => removeSales(s._id)}>Hapus</RowActionButton>
                </td>
              </tr>
            ))}
            {!loading && sales.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center font-mono text-sm text-muted">
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
