"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Select } from "@/components/ui/Form";

export interface CourierOption {
  _id: string;
  name: string;
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Marks an invoice as physically shipped — independent of payment status
 * (draft is the only status this isn't offered for). Opens a small modal
 * instead of a bare confirm() — per the user's request 2026-09-19
 * ("mereka harus masukan tanggalnya kapan, lalu pilih kurirnya"): Tanggal
 * Dikirim (defaults to today) and Kurir (defaults to the invoice's own
 * `kurir`, since that's usually still correct — only needs changing when
 * the actual courier ended up different). Posts to
 * /api/invoices/[id]/kirim; once marked, the invoice drops out of
 * Beranda's "Perlu Dikirim" widget and /follow-up?view=kirim (see
 * lib/dashboard.ts's getShippingPriorityInvoices). A changed Kurir here
 * replaces Invoice.kurir itself, which the PDF/preview already reads live
 * — no separate "actual courier" field, no PDF code to touch.
 */
export default function TandaiKirimButton({
  invoiceId,
  nomor,
  customerNama,
  couriers,
  currentKurir,
  className,
}: {
  invoiceId: string;
  nomor: string;
  customerNama?: string;
  couriers: CourierOption[];
  currentKurir?: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tanggal, setTanggal] = useState(todayInputValue);
  const [kurir, setKurir] = useState(currentKurir ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    setTanggal(todayInputValue());
    setKurir(currentKurir ?? "");
    setError(null);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!kurir) return setError("Pilih kurir terlebih dahulu.");
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/kirim`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dikirim: true, tanggalDikirimAktual: tanggal, kurir }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal menandai invoice sudah dikirim");
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menandai invoice sudah dikirim");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={
          className ??
          "cursor-pointer border border-ink bg-ink px-3 py-1.5 font-sans text-[0.72rem] font-semibold text-accent no-underline hover:bg-ink/85"
        }
      >
        Tandai Sudah Kirim
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={() => !saving && setOpen(false)}
        >
          <div className="w-full max-w-sm bg-panel shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line bg-surface px-5 py-4">
              <div>
                <div className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-muted">
                  Tandai Sudah Kirim
                </div>
                <h2 className="font-sans text-[1rem] font-extrabold text-ink">{nomor}</h2>
              </div>
              <button
                type="button"
                onClick={() => !saving && setOpen(false)}
                aria-label="Tutup"
                className="flex h-9 w-9 cursor-pointer items-center justify-center border border-line text-lg text-ink hover:border-accent hover:text-accent-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
              {customerNama && (
                <p className="font-mono text-[0.75rem] text-muted">
                  Konfirmasi invoice ini sudah dikirim ke <b className="text-ink">{customerNama}</b>. Kalau kurirnya
                  beda dari yang tercatat, invoice (dan PDF-nya) ikut ter-update otomatis.
                </p>
              )}
              <Field label="Tanggal Dikirim" hint="Default hari ini — bisa diubah kalau baru dicatat belakangan.">
                <input
                  type="date"
                  required
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 font-sans text-[0.9rem] text-ink outline-offset-1 focus:outline-2 focus:outline-moss"
                />
              </Field>
              <Field
                label="Kurir"
                hint="Default = kurir yang sudah tercatat di invoice ini. Ganti di sini kalau ternyata beda pengirimnya."
              >
                <Select value={kurir} onChange={(e) => setKurir(e.target.value)}>
                  <option value="">— Pilih kurir —</option>
                  {couriers.map((c) => (
                    <option key={c._id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              {error && <p className="font-mono text-[0.75rem] text-danger">{error}</p>}
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                  className="flex-1 cursor-pointer border border-line py-2.5 font-sans text-[0.85rem] font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || !kurir}
                  className="flex-1 cursor-pointer border border-ink bg-ink py-2.5 font-sans text-[0.85rem] font-bold text-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
