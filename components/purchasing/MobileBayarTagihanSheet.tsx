"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rupiah, rupiahCompact, formatDateShort } from "@/lib/format";
import type { TagihanBerjalanRow } from "@/lib/purchasing";

/**
 * "7f" — mobile-only Bayar Tagihan: dark header, a 2-col stat strip, a
 * checkbox list, and a sticky bottom sheet (kas sebelum → kas sesudah →
 * tombol bayar) pinned above the tab bar. Skips the desktop sheet's
 * tanggal/bukti/catatan fields for a one-tap flow — tanggal defaults to
 * today and bukti/catatan are optional on the API anyway (see
 * app/api/purchase-bills/[id]/pay/route.ts). Posts to the same
 * per-bill /api/purchase-bills/[id]/pay endpoint in parallel, same as the
 * desktop sheet (components/purchasing/BayarTagihanSheet.tsx) — no separate
 * batch endpoint.
 */
export default function MobileBayarTagihanSheet({
  rows,
  kasTersedia,
}: {
  rows: TagihanBerjalanRow[];
  kasTersedia: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(rows.map((r) => r.id)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRows = rows.filter((r) => selected.has(r.id));
  const total = selectedRows.reduce((s, r) => s + r.totalTagihan, 0);
  const kasSetelahBayar = kasTersedia - total;
  const jatuhTempo7HariNilai = rows
    .filter((r) => r.hariTerlambat > 0 || r.hariMenujuJatuhTempo <= 7)
    .reduce((s, r) => s + r.totalTagihan, 0);

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
      setError("Pilih minimal 1 tagihan.");
      return;
    }
    setSaving(true);
    try {
      const results = await Promise.all(
        selectedRows.map((r) => fetch(`/api/purchase-bills/${r.id}/pay`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }))
      );
      for (const res of results) {
        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          throw new Error(b.error || "Gagal membayar tagihan");
        }
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membayar tagihan");
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
            <div className="font-sans text-[1.05rem] font-extrabold tracking-tight">Bayar Tagihan</div>
            <div className="mt-0.5 font-sans text-[10.5px] text-white/50">Urut jatuh tempo · {rows.length} tagihan</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 border-b-2 border-ink bg-white">
        <div className="border-r border-line px-4 py-3.5">
          <div className="font-sans text-[9.5px] font-bold uppercase tracking-[0.13em] text-muted">Kas sekarang</div>
          <div className="mt-1 font-sans text-[1.1rem] font-extrabold tracking-tight">{rupiahCompact(kasTersedia)}</div>
        </div>
        <div className="px-4 py-3.5">
          <div className="font-sans text-[9.5px] font-bold uppercase tracking-[0.13em] text-muted">Jatuh tempo ≤7 hari</div>
          <div className="mt-1 font-sans text-[1.1rem] font-extrabold tracking-tight text-accent-700">{rupiahCompact(jatuhTempo7HariNilai)}</div>
        </div>
      </div>

      <div className="flex-1">
        <div className="px-4 pb-2 pt-4 font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">Pilih tagihan</div>
        <div className="border-t border-line bg-white">
          {rows.map((r) => {
            const checked = selected.has(r.id);
            const urgent = r.hariTerlambat > 0;
            return (
              <label
                key={r.id}
                className={`grid grid-cols-[24px_1fr_auto] items-center gap-3 border-b border-line py-3.5 pl-3 pr-4 ${
                  urgent ? "border-l-4 border-l-accent" : "border-l-4 border-l-line"
                }`}
              >
                <span
                  className={`flex h-[22px] w-[22px] items-center justify-center ${checked ? "bg-accent" : "border-[1.5px] border-line"}`}
                >
                  {checked && (
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
                      <path d="M4 10.5 8 14.5 16 6" />
                    </svg>
                  )}
                </span>
                <input type="checkbox" checked={checked} onChange={() => toggle(r.id)} className="sr-only" />
                <span className="min-w-0">
                  <b className="block truncate font-sans text-[0.85rem]">{r.supplier}</b>
                  <span className={`mt-0.5 block font-sans text-[0.72rem] ${urgent ? "font-bold text-accent-700" : "text-muted"}`}>
                    {urgent
                      ? `Telat ${r.hariTerlambat} hari · ${r.nomor}`
                      : r.jatuhTempo
                        ? r.hariMenujuJatuhTempo === 0
                          ? `Jatuh tempo hari ini · ${r.nomor}`
                          : r.hariMenujuJatuhTempo === 1
                            ? `Jatuh tempo besok · ${r.nomor}`
                            : `${formatDateShort(r.jatuhTempo)} · ${r.nomor}`
                        : r.nomor}
                  </span>
                </span>
                <b className="whitespace-nowrap font-sans text-[0.82rem] tracking-tight">{rupiahCompact(r.totalTagihan)}</b>
              </label>
            );
          })}
          {rows.length === 0 && (
            <div className="py-10 text-center font-sans text-[0.85rem] text-muted">Semua tagihan sudah dibayar. 🎉</div>
          )}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="sticky bottom-[58px] border-t-2 border-ink bg-white px-4 py-3.5">
          <div className="flex items-baseline justify-between">
            <span className="font-sans text-[0.75rem] font-bold text-muted">{selectedRows.length} tagihan dipilih</span>
            <b className="font-sans text-[1.15rem] tracking-tight">{rupiah(total)}</b>
          </div>
          <div className="mt-2.5 grid grid-cols-[1fr_auto_1fr] items-center gap-2.5 border border-line bg-panel px-3 py-2.5">
            <span>
              <span className="block font-sans text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Kas sebelum</span>
              <b className="mt-0.5 block font-sans text-[0.85rem] tracking-tight">{rupiahCompact(kasTersedia)}</b>
            </span>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent-700">
              <path d="M4 10h11M10.5 5.5 15 10l-4.5 4.5" />
            </svg>
            <span className="text-right">
              <span className="block font-sans text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Kas sesudah</span>
              <b className={`mt-0.5 block font-sans text-[0.85rem] tracking-tight ${kasSetelahBayar < 0 ? "text-accent-700" : ""}`}>
                {rupiahCompact(kasSetelahBayar)}
              </b>
            </span>
          </div>
          {error && <div className="mt-2 font-sans text-[0.75rem] text-danger">{error}</div>}
          <button
            type="button"
            onClick={handlePay}
            disabled={saving || selectedRows.length === 0}
            className="mt-2.5 flex min-h-[44px] w-full items-center justify-center gap-2 bg-accent px-4 py-3.5 font-sans text-[0.9rem] font-extrabold text-ink disabled:opacity-50"
          >
            {saving ? "Memproses..." : `Bayar ${selectedRows.length} tagihan`}
          </button>
        </div>
      )}
    </div>
  );
}
