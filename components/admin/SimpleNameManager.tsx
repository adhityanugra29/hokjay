"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import { Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { RowActionButton } from "@/components/ui/RowAction";

interface NameRow {
  _id: string;
  name: string;
}

/** Admin list of plain names (add + delete) backed by `endpoint` (GET/POST list, DELETE `${endpoint}/:id`). */
export default function SimpleNameManager({
  endpoint,
  title,
  placeholder,
  columnLabel,
  emptyText,
  errorText,
  noUppercase,
}: {
  endpoint: string;
  title: string;
  placeholder: string;
  columnLabel: string;
  emptyText: string;
  errorText: string;
  /** Nama dicocokkan persis di tempat lain (mis. metode "Tunai" → akun kas) — jangan dikapitalkan. */
  noUppercase?: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<NameRow[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(endpoint);
    setRows(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) router.refresh();
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || errorText);
    } else {
      setName("");
      await load();
    }
    setSaving(false);
  }

  async function remove(id: string) {
    setRows((prev) => prev.filter((r) => r._id !== id));
    await fetch(`${endpoint}/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <Panel>
      <PanelHead title={title}>
        <form onSubmit={add} className="flex flex-wrap gap-2.5">
          <Input noUppercase={noUppercase} value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} className="min-w-[180px] flex-1" />
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
                {columnLabel}
              </th>
              <th className="border-b border-line px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="hover:bg-[#fbfaf5]">
                <td className="border-b border-line px-5 py-4 font-medium">{r.name}</td>
                <td className="border-b border-line px-5 py-4">
                  <RowActionButton onClick={() => remove(r._id)}>Hapus</RowActionButton>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={2} className="px-5 py-8 text-center font-mono text-sm text-muted">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>
    </Panel>
  );
}
