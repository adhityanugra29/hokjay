"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { Field, FormActions, Textarea } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";

/**
 * Free-text Syarat & Ketentuan shown on every Invoice PDF/preview — per
 * the user's request 2026-09-19 ("ditambahkan ke pengaturan saja"), so
 * Owner/Admin can rewrite it any time without a code change. One point per
 * line; InvoicePrintDoc.tsx/InvoiceDocument.tsx render each non-empty line
 * as its own numbered item. Starts pre-filled with a generic draft
 * (Pengaturan.ts's DEFAULT_SYARAT_KETENTUAN) the user explicitly asked to
 * review/edit before it reaches a real customer.
 */
export default function PengaturanSyaratKetentuan() {
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/pengaturan")
      .then((r) => r.json())
      .then((d) => setText(d.syaratKetentuan ?? ""))
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
        Tampil di bagian bawah PDF/preview Invoice. Satu poin per baris — setiap baris otomatis jadi nomor
        tersendiri. Baris kosong diabaikan.
      </p>
      <form onSubmit={handleSubmit}>
        <Field label="Isi Syarat & Ketentuan">
          <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Satu poin per baris..." />
        </Field>

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
