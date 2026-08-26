"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Field, FormActions, Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import Logo from "@/components/layout/Logo";
import { useLoadingOverlay } from "@/components/ui/LoadingOverlay";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const { show, hide } = useLoadingOverlay();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    // Shown immediately on submit rather than waiting for the fetch patch's
    // 2s auto-threshold (LoadingOverlay.tsx) — login is exactly the moment
    // someone's staring at the screen wondering if their click registered.
    // Left showing on success (no hide() call) since the page unloads
    // straight into a hard navigation — see the window.location.href note
    // below — so the overlay stays up through that redirect instead of
    // flickering off right before the new page starts loading.
    show();
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal login");
      }
      // Hard navigation on purpose — a client-side router.push() here can
      // race the just-set session cookie against Proxy's read of it (or
      // serve a stale RSC cache from before login), occasionally bouncing
      // straight back to /login. A full navigation always re-runs Proxy
      // with the fresh cookie.
      const next = searchParams.get("next") || "/";
      window.location.href = next;
    } catch (err) {
      hide();
      setError(err instanceof Error ? err.message : "Gagal login");
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <Logo />
          <div className="mt-2.5 font-sans text-[0.7rem] uppercase tracking-[0.12em] text-muted">
            CV Horeca Jaya · Kelola Usaha
          </div>
        </div>
        <Panel className="p-7">
          <h1 className="mb-5 font-sans text-[1.2rem] font-extrabold">Masuk</h1>
          <form onSubmit={handleSubmit}>
            <Field label="Email">
              <Input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@horecajaya.id"
                autoFocus
              />
            </Field>
            <div className="mt-4">
              <Field label="Password">
                <Input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
            </div>

            {error && <div className="mt-3 font-mono text-[0.75rem] text-danger">{error}</div>}

            <FormActions>
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "Memproses..." : "Masuk"}
              </Button>
            </FormActions>
          </form>
        </Panel>
      </div>
    </div>
  );
}
