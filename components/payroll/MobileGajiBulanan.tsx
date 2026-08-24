"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rupiah, rupiahCompact } from "@/lib/format";
import type { GajiBulananRow } from "@/lib/payroll";

const TIPE_LABEL: Record<GajiBulananRow["tipe"], string> = { sales: "Sales Tetap", karyawan: "Karyawan" };

/**
 * "7j" — mobile-only Payroll: dark header, sales-tetap/karyawan stat strip,
 * checkbox list, and a sticky bottom kas-sebelum/sesudah summary + pay
 * button — same shape as MobileBayarTagihanSheet ("7f"). Per the user's
 * confirmation 2026-08-25: unlike the mockup, this does NOT merge in
 * variable sales komisi (a separate tab/dataset — components/insentif/
 * BayarKomisiSheet.tsx — with its own bayar flow) or add commission tiers/
 * held-status/WhatsApp auto-send, since none of that exists in the app
 * today. This is the mobile version of the existing "Gaji" tab only
 * (gaji pokok sales tetap + gaji karyawan, GajiBulananSheet's data).
 */
export default function MobileGajiBulanan({
  rows,
  periodOptions,
  periode,
  kasSekarang,
}: {
  rows: GajiBulananRow[];
  periodOptions: string[];
  periode: string;
  kasSekarang: number;
}) {
  const router = useRouter();
  const belumDibayar = rows.filter((r) => !r.sudahDibayar && r.siapBayar);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(belumDibayar.map((r) => r.id)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRows = belumDibayar.filter((r) => selected.has(r.id));
  const total = selectedRows.reduce((s, r) => s + r.jumlah, 0);
  const kasSetelah = kasSekarang - total;
  const salesTotal = rows.filter((r) => r.tipe === "sales").reduce((s, r) => s + r.jumlah, 0);
  const karyawanTotal = rows.filter((r) => r.tipe === "karyawan").reduce((s, r) => s + r.jumlah, 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handlePay() {
    setError(null);
    if (selectedRows.length === 0) {
      setError("Pilih minimal 1 orang.");
      return;
    }
    setSaving(true);
    try {
      const salesIds = selectedRows.filter((r) => r.tipe === "sales").map((r) => r.id);
      const karyawanIds = selectedRows.filter((r) => r.tipe === "karyawan").map((r) => r.id);
      const results = await Promise.all([
        salesIds.length > 0
          ? fetch("/api/payroll/gaji-sales/bayar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ periode, salesIds }),
            })
          : null,
        karyawanIds.length > 0
          ? fetch("/api/payroll/gaji-karyawan/bayar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ periode, karyawanIds }),
            })
          : null,
      ]);
      for (const res of results) {
        if (res && !res.ok) {
          const b = await res.json().catch(() => ({}));
          throw new Error(b.error || "Gagal membayar gaji");
        }
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membayar gaji");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-58px)] flex-col bg-panel md:hidden">
      <div className="bg-ink px-4 pb-4 pt-3 text-white">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => router.back()} className="-ml-2 flex h-11 w-11 items-center justify-center text-white">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <path d="M12.5 4.5 7 10l5.5 5.5" />
            </svg>
          </button>
          <div>
            <div className="font-sans text-[1.05rem] font-extrabold tracking-tight">Payroll</div>
            <div className="mt-0.5 font-sans text-[10.5px] text-white/50">Periode {periode}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 border-b-2 border-ink bg-white">
        <div className="border-r border-line px-4 py-3.5">
          <div className="font-sans text-[9.5px] font-bold uppercase tracking-[0.13em] text-muted">Sales tetap</div>
          <div className="mt-1 font-sans text-[1.05rem] font-extrabold tracking-tight">{rupiahCompact(salesTotal)}</div>
        </div>
        <div className="px-4 py-3.5">
          <div className="font-sans text-[9.5px] font-bold uppercase tracking-[0.13em] text-muted">Karyawan</div>
          <div className="mt-1 font-sans text-[1.05rem] font-extrabold tracking-tight">{rupiahCompact(karyawanTotal)}</div>
        </div>
      </div>

      <div className="border-b border-line bg-white px-4 py-2.5">
        <select
          value={periode}
          onChange={(e) => router.push(`/payroll/gaji?periode=${e.target.value}`)}
          className="w-full border border-line bg-white px-3 py-2 font-sans text-[0.82rem]"
        >
          {periodOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1">
        <div className="px-4 pb-2 pt-4 font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
          Daftar bayar · {rows.length} orang
        </div>
        <div className="border-t border-line bg-white">
          {rows.map((r) => {
            const disabled = r.sudahDibayar || !r.siapBayar;
            const checked = r.sudahDibayar || selected.has(r.id);
            return (
              <label
                key={`${r.tipe}-${r.id}`}
                className={`grid grid-cols-[24px_1fr] items-center gap-3 border-b border-line py-3.5 pl-3 pr-4 ${disabled ? "opacity-60" : ""} ${
                  r.siapBayar && !r.sudahDibayar ? "border-l-4 border-l-line" : "border-l-4 border-l-accent"
                }`}
              >
                <span className={`flex h-[22px] w-[22px] items-center justify-center ${checked ? "bg-ink" : "border-[1.5px] border-line"}`}>
                  {checked && (
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
                      <path d="M4 10.5 8 14.5 16 6" />
                    </svg>
                  )}
                </span>
                <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(r.id)} className="sr-only" />
                <span className="min-w-0">
                  <b className="block font-sans text-[0.85rem]">
                    {r.nama} <span className="font-mono text-[9px] font-normal uppercase tracking-wide text-muted">{TIPE_LABEL[r.tipe]}</span>
                  </b>
                  <span className={`mt-0.5 block font-sans text-[0.72rem] ${r.sudahDibayar ? "text-muted" : r.siapBayar ? "text-muted" : "font-bold text-accent"}`}>
                    {r.sudahDibayar ? "Sudah dibayar" : r.siapBayar ? r.subtitle : r.tipe === "sales" ? "Rekening belum diverifikasi" : "Belum ada absensi"}
                  </span>
                </span>
                <b className="col-start-2 whitespace-nowrap font-sans text-[0.82rem] tracking-tight">{rupiahCompact(r.jumlah)}</b>
              </label>
            );
          })}
          {rows.length === 0 && (
            <div className="py-10 text-center font-sans text-[0.82rem] text-muted">Belum ada sales tetap atau karyawan aktif.</div>
          )}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="sticky bottom-[58px] border-t-2 border-ink bg-white px-4 py-3.5">
          <div className="flex items-baseline justify-between">
            <span className="font-sans text-[0.75rem] font-bold text-muted">{selectedRows.length} orang dipilih</span>
            <b className="font-sans text-[1.15rem] tracking-tight">{rupiah(total)}</b>
          </div>
          <div className="mt-2.5 grid grid-cols-[1fr_auto_1fr] items-center gap-2.5 border border-line bg-panel px-3 py-2.5">
            <span>
              <span className="block font-sans text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Kas sebelum</span>
              <b className="mt-0.5 block font-sans text-[0.85rem] tracking-tight">{rupiahCompact(kasSekarang)}</b>
            </span>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent">
              <path d="M4 10h11M10.5 5.5 15 10l-4.5 4.5" />
            </svg>
            <span className="text-right">
              <span className="block font-sans text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Kas sesudah</span>
              <b className={`mt-0.5 block font-sans text-[0.85rem] tracking-tight ${kasSetelah < 0 ? "text-accent" : ""}`}>{rupiahCompact(kasSetelah)}</b>
            </span>
          </div>
          {error && <div className="mt-2 font-sans text-[0.75rem] text-danger">{error}</div>}
          <button
            type="button"
            onClick={handlePay}
            disabled={saving || selectedRows.length === 0}
            className="mt-2.5 flex min-h-[44px] w-full items-center justify-center gap-2 bg-accent px-4 py-3.5 font-sans text-[0.9rem] font-extrabold text-white disabled:opacity-50"
          >
            {saving ? "Memproses..." : `Bayar ${selectedRows.length} orang`}
          </button>
        </div>
      )}
    </div>
  );
}
