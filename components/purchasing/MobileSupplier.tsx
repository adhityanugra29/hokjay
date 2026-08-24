"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rupiahCompact } from "@/lib/format";
import type { SupplierWithUtangRow } from "@/lib/purchasing";

const BLANK = { namaUsaha: "", alamat: "", bank: "", nomorRekening: "", kontak: "", catatan: "" };

/**
 * "7l" — mobile-only Supplier list: real utang berjalan per supplier
 * (unpaid PurchaseBill grouped by supplierRef), sorted highest-first, plus
 * a compact inline "Tambah supplier" form (same /api/suppliers POST
 * SupplierManager.tsx already uses). Per the user's confirmation
 * 2026-08-25, deliberately does NOT add lead-time or on-time-delivery-%
 * stats — not tracked anywhere in the app today.
 */
export default function MobileSupplier({ suppliers, totalUtang }: { suppliers: SupplierWithUtangRow[]; totalUtang: number }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [values, setValues] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal menambah supplier");
      }
      setValues(BLANK);
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah supplier");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="-mx-6 mt-1 flex flex-col bg-panel md:hidden">
      <div className="grid grid-cols-2 border-b-2 border-ink bg-white">
        <div className="border-r border-line px-4 py-3.5">
          <div className="font-sans text-[9.5px] font-bold uppercase tracking-[0.13em] text-muted">Supplier aktif</div>
          <div className="mt-1 font-sans text-[1.1rem] font-extrabold tracking-tight">{suppliers.length}</div>
        </div>
        <div className="px-4 py-3.5">
          <div className="font-sans text-[9.5px] font-bold uppercase tracking-[0.13em] text-muted">Utang berjalan</div>
          <div className="mt-1 font-sans text-[1.1rem] font-extrabold tracking-tight text-accent">{rupiahCompact(totalUtang)}</div>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 border-b-2 border-ink bg-white px-4 py-4">
          <input
            required
            placeholder="Nama usaha"
            value={values.namaUsaha}
            onChange={(e) => setValues((v) => ({ ...v, namaUsaha: e.target.value }))}
            className="border border-line px-3 py-2.5 font-sans text-[0.85rem]"
          />
          <input
            required
            placeholder="Alamat"
            value={values.alamat}
            onChange={(e) => setValues((v) => ({ ...v, alamat: e.target.value }))}
            className="border border-line px-3 py-2.5 font-sans text-[0.85rem]"
          />
          <div className="grid grid-cols-2 gap-2.5">
            <input
              required
              placeholder="Bank"
              value={values.bank}
              onChange={(e) => setValues((v) => ({ ...v, bank: e.target.value }))}
              className="border border-line px-3 py-2.5 font-sans text-[0.85rem]"
            />
            <input
              required
              placeholder="No. rekening"
              value={values.nomorRekening}
              onChange={(e) => setValues((v) => ({ ...v, nomorRekening: e.target.value }))}
              className="border border-line px-3 py-2.5 font-sans text-[0.85rem]"
            />
          </div>
          <input
            placeholder="Kontak (opsional)"
            value={values.kontak}
            onChange={(e) => setValues((v) => ({ ...v, kontak: e.target.value }))}
            className="border border-line px-3 py-2.5 font-sans text-[0.85rem]"
          />
          {error && <div className="font-sans text-[0.75rem] text-danger">{error}</div>}
          <button
            type="submit"
            disabled={saving}
            className="flex min-h-[44px] items-center justify-center bg-accent px-4 py-3 font-sans text-[0.85rem] font-extrabold text-white disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan supplier"}
          </button>
        </form>
      )}

      <div className="px-4 pb-2 pt-4 font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
        Supplier · urut utang
      </div>
      <div className="border-t border-line bg-white">
        {suppliers.map((s) => (
          <div
            key={s.id}
            className={`border-b border-line px-4 py-3 ${s.utangBerjalan > 0 ? "border-l-4 border-l-accent pl-3" : "border-l-4 border-l-line pl-3"}`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <b className="min-w-0 truncate font-sans text-[0.85rem]">{s.namaUsaha}</b>
              {s.utangBerjalan > 0 && (
                <b className="whitespace-nowrap font-sans text-[0.8rem] tracking-tight text-accent">{rupiahCompact(s.utangBerjalan)}</b>
              )}
            </div>
            <div className="mt-1 truncate font-sans text-[0.72rem] text-muted">
              {s.bank} {s.nomorRekening}
              {s.kontak ? ` · ${s.kontak}` : ""}
            </div>
          </div>
        ))}
        {suppliers.length === 0 && (
          <div className="py-10 text-center font-sans text-[0.82rem] text-muted">Belum ada supplier.</div>
        )}
      </div>

      <div className="sticky bottom-[58px] border-t-2 border-ink bg-white px-4 py-3.5">
        <div className="grid grid-cols-2 gap-2.5">
          <a
            href="/purchasing/po/baru"
            className="flex min-h-[44px] items-center justify-center bg-accent px-3 py-3.5 text-center font-sans text-[0.82rem] font-extrabold text-white no-underline"
          >
            Buat PO baru
          </a>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex min-h-[44px] items-center justify-center border border-line px-3 py-3.5 text-center font-sans text-[0.82rem] font-bold text-ink"
          >
            {showForm ? "Batal" : "Tambah supplier"}
          </button>
        </div>
      </div>
    </div>
  );
}
