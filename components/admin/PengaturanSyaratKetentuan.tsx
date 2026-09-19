"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { Field, FormActions, Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";

/**
 * Free-text Syarat & Ketentuan shown on every Invoice PDF/preview — per
 * the user's request 2026-09-19 ("ditambahkan ke pengaturan saja"). Lives
 * under Admin → Invoice (moved out of Keuangan 2026-09-20, "jangan taro di
 * keuangan, taro saja di invoice" — this is invoice content, not a
 * finance setting).
 *
 * One input per point ("Baris 1", "Baris 2", ...) instead of a single
 * freeform textarea — per the user's follow-up request 2026-09-20 ("dibuat
 * rapih, baris 1, baris 2, baris 3 dst, supaya lebih mudah ... untuk
 * pengaplikasian ke invoicenya"): each row here maps 1:1 to the numbered
 * point that actually prints on the invoice, so what you're editing looks
 * like what the customer sees. Still saved/loaded as one newline-joined
 * string (Pengaturan.syaratKetentuan, unchanged on the API/model side) —
 * only this form's own presentation changed.
 */
export default function PengaturanSyaratKetentuan() {
  const [lines, setLines] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/pengaturan")
      .then((r) => r.json())
      .then((d) => {
        const parsed = String(d.syaratKetentuan ?? "")
          .split("\n")
          .filter((line: string) => line.trim() !== "");
        setLines(parsed.length > 0 ? parsed : [""]);
      })
      .finally(() => setLoaded(true));
  }, []);

  function updateLine(idx: number, value: string) {
    setLines((prev) => prev.map((l, i) => (i === idx ? value : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, ""]);
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const text = lines.map((l) => l.trim()).filter(Boolean).join("\n");
      const res = await fetch("/api/pengaturan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syaratKetentuan: text }),
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
      <h2 className="mb-1 text-[1.05rem] font-extrabold">Syarat &amp; Ketentuan (Invoice)</h2>
      <p className="mb-5 text-[0.8rem] text-muted">
        Tampil di bagian bawah PDF/preview Invoice, satu baris di sini = satu poin bernomor di invoice.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-3">
          {lines.map((line, idx) => (
            <Field key={idx} label={`Baris ${idx + 1}`}>
              <div className="flex items-center gap-2">
                <Input value={line} onChange={(e) => updateLine(idx, e.target.value)} placeholder="Isi poin ini..." />
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  disabled={lines.length === 1}
                  aria-label={`Hapus baris ${idx + 1}`}
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center border border-line text-muted hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ✕
                </button>
              </div>
            </Field>
          ))}
        </div>

        <button
          type="button"
          onClick={addLine}
          className="mt-3 cursor-pointer border border-dashed border-line px-3.5 py-2 font-sans text-[0.78rem] font-semibold text-accent-700 hover:border-accent"
        >
          + Tambah Baris
        </button>

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
