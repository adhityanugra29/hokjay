"use client";

import { useEffect, useState } from "react";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import { Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { RowActionButton } from "@/components/ui/RowAction";

interface ZoneRow {
  _id: string;
  name: string;
  cost: number;
}

/** Manages the distance-tier shipping zones used to price Ongkos Kirim on invoices. */
export default function ShippingZoneManager() {
  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [name, setName] = useState("");
  const [cost, setCost] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/shipping-zones");
    setZones(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addZone(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/shipping-zones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, cost: Number(cost) || 0 }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Gagal menambah zona");
    } else {
      setName("");
      setCost("0");
      await load();
    }
    setSaving(false);
  }

  async function updateCost(id: string, newCost: number) {
    setZones((prev) => prev.map((z) => (z._id === id ? { ...z, cost: newCost } : z)));
    await fetch(`/api/shipping-zones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cost: newCost }),
    });
  }

  async function removeZone(id: string) {
    setZones((prev) => prev.filter((z) => z._id !== id));
    await fetch(`/api/shipping-zones/${id}`, { method: "DELETE" });
  }

  return (
    <Panel>
      <PanelHead title="Kelola Zona Pengiriman (Ongkos Kirim)">
        <form onSubmit={addZone} className="flex flex-wrap gap-2.5">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Dalam Kota (0-15 km)"
            className="min-w-[200px] flex-1"
          />
          <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Ongkos kirim (Rp)" className="w-[160px]" />
          <Button type="submit" disabled={saving}>
            + Tambah
          </Button>
        </form>
      </PanelHead>
      {error && <div className="px-5 pt-3 font-mono text-[0.72rem] text-danger">{error}</div>}
      <div className="px-5 pt-3 font-mono text-[0.7rem] text-muted">
        Zona ini yang menentukan Ongkos Kirim di form Invoice — bukan pilihan Kurir. Atur berdasarkan jarak/wilayah
        pengiriman kamu sendiri (mis. dalam kota, luar kota, luar pulau).
      </div>
      <TableScroll>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Zona
              </th>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Ongkos Kirim
              </th>
              <th className="border-b border-line px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {zones.map((z) => (
              <tr key={z._id} className="hover:bg-[#fbfaf5]">
                <td className="border-b border-line px-5 py-4 font-medium">{z.name}</td>
                <td className="border-b border-line px-5 py-4">
                  <Input
                    type="number"
                    defaultValue={z.cost}
                    onBlur={(e) => updateCost(z._id, Number(e.target.value) || 0)}
                    className="w-[160px]"
                  />
                </td>
                <td className="border-b border-line px-5 py-4">
                  <RowActionButton onClick={() => removeZone(z._id)}>Hapus</RowActionButton>
                </td>
              </tr>
            ))}
            {!loading && zones.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center font-mono text-sm text-muted">
                  Belum ada zona. Contoh: &quot;Dalam Kota&quot; Rp100.000, &quot;Luar Kota&quot; Rp250.000.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>
    </Panel>
  );
}
