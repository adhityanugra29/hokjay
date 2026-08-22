"use client";

import { useEffect, useState } from "react";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import { Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { RowActionButton } from "@/components/ui/RowAction";

interface CourierRow {
  _id: string;
  name: string;
}

/**
 * Couriers are just delivery methods (who physically ships it) — Ongkos
 * Kirim is entered manually per invoice on the invoice form, not derived
 * from the courier chosen here.
 */
export default function CourierManager() {
  const [couriers, setCouriers] = useState<CourierRow[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/couriers");
    setCouriers(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addCourier(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/couriers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, cost: 0 }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Gagal menambah kurir");
    } else {
      setName("");
      await load();
    }
    setSaving(false);
  }

  async function removeCourier(id: string) {
    setCouriers((prev) => prev.filter((c) => c._id !== id));
    await fetch(`/api/couriers/${id}`, { method: "DELETE" });
  }

  return (
    <Panel>
      <PanelHead title="Kelola Kurir">
        <form onSubmit={addCourier} className="flex flex-wrap gap-2.5">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama kurir baru..." className="min-w-[180px] flex-1" />
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
                Kurir
              </th>
              <th className="border-b border-line px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {couriers.map((c) => (
              <tr key={c._id} className="hover:bg-[#fbfaf5]">
                <td className="border-b border-line px-5 py-4 font-medium">{c.name}</td>
                <td className="border-b border-line px-5 py-4">
                  <RowActionButton onClick={() => removeCourier(c._id)}>Hapus</RowActionButton>
                </td>
              </tr>
            ))}
            {!loading && couriers.length === 0 && (
              <tr>
                <td colSpan={2} className="px-5 py-8 text-center font-mono text-sm text-muted">
                  Belum ada kurir. Contoh: Kurir Internal, JNE Trucking, Diambil Sendiri.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>
    </Panel>
  );
}
