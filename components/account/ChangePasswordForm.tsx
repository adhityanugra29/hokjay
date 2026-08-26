"use client";

import { useState } from "react";
import { Panel, PanelHead } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";

export default function ChangePasswordForm() {
  const [passwordLama, setPasswordLama] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);

    if (passwordBaru !== konfirmasi) {
      setError("Konfirmasi password baru tidak sama");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordLama, passwordBaru }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal mengganti password");
      }
      setPasswordLama("");
      setPasswordBaru("");
      setKonfirmasi("");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengganti password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel>
      <PanelHead title="Ganti Password" />
      <form onSubmit={handleSubmit} className="p-5">
        <FormGrid>
          <Field label="Password Sekarang" span2>
            <Input
              required
              type="password"
              autoComplete="current-password"
              value={passwordLama}
              onChange={(e) => setPasswordLama(e.target.value)}
            />
          </Field>
          <Field label="Password Baru" hint="Minimal 6 karakter">
            <Input
              required
              type="password"
              autoComplete="new-password"
              value={passwordBaru}
              onChange={(e) => setPasswordBaru(e.target.value)}
            />
          </Field>
          <Field label="Konfirmasi Password Baru">
            <Input
              required
              type="password"
              autoComplete="new-password"
              value={konfirmasi}
              onChange={(e) => setKonfirmasi(e.target.value)}
            />
          </Field>
        </FormGrid>
        {error && <div className="mt-3 font-mono text-[0.75rem] text-danger">{error}</div>}
        {done && <div className="mt-3 font-mono text-[0.75rem] font-bold text-ink">✓ Password berhasil diganti.</div>}
        <FormActions>
          <Button type="submit" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Password Baru"}
          </Button>
        </FormActions>
      </form>
    </Panel>
  );
}
