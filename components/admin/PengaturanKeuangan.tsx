"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";

export default function PengaturanKeuangan() {
  const [kasAwal, setKasAwal] = useState("");
  const [kasAwalTanggal, setKasAwalTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/pengaturan")
      .then((r) => r.json())
      .then((d) => {
        setKasAwal(String(d.kasAwal ?? 0));
        if (d.kasAwalTanggal) setKasAwalTanggal(new Date(d.kasAwalTanggal).toISOString().slice(0, 10));
      })
      .finally(() => setLoaded(true));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/pengaturan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kasAwal: Number(kasAwal), kasAwalTanggal }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal menyimpan pengaturan");
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return null;

  return (
    <Panel className="max-w-xl p-7">
      <h2 className="mb-1 text-[1.05rem] font-extrabold">Kas Awal</h2>
      <p className="mb-5 text-[0.8rem] text-muted">
        Saldo kas pembukaan sebelum aplikasi ini dipakai — dicatat sebagai jurnal pembukaan (debit Kas, kredit Modal
        Pemilik) supaya Neraca Saldo & Neraca cocok dengan saldo kas sebenarnya. Ubah kapan saja, entri lama
        otomatis diganti (bukan menumpuk).
      </p>
      <form onSubmit={handleSubmit}>
        <FormGrid className="sm:grid-cols-1">
          <Field label="Nominal Kas Awal">
            <Input
              required
              type="number"
              min={0}
              value={kasAwal}
              onChange={(e) => setKasAwal(e.target.value)}
              placeholder="Rp 0"
            />
          </Field>
          <Field label="Per Tanggal">
            <Input required type="date" value={kasAwalTanggal} onChange={(e) => setKasAwalTanggal(e.target.value)} />
          </Field>
        </FormGrid>

        {error && <div className="mt-3 text-[0.75rem] text-accent-700">{error}</div>}
        {saved && <div className="mt-3 text-[0.75rem] text-accent-700">Tersimpan.</div>}

        <FormActions>
          <Button type="submit" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </FormActions>
      </form>
    </Panel>
  );
}
