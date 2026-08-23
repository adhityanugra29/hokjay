"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import UploadBox from "@/components/ui/UploadBox";
import { rupiah } from "@/lib/format";
import type { GajiSalesRow } from "@/lib/payroll";

/** Batch gaji-pokok payout sheet for "tetap" sales — same checkbox-batch shape as BayarKomisiSheet. */
export default function GajiSalesSheet({
  rows,
  periodOptions,
  periode,
}: {
  rows: GajiSalesRow[];
  periodOptions: string[];
  periode: string;
}) {
  const router = useRouter();
  const belumDibayar = rows.filter((r) => !r.sudahDibayar);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(belumDibayar.filter((r) => r.rekeningTerverifikasi).map((r) => r.salesId))
  );
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [buktiUrl, setBuktiUrl] = useState("");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRows = belumDibayar.filter((r) => selected.has(r.salesId));
  const total = selectedRows.reduce((s, r) => s + r.gajiPokok, 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function changePeriode(value: string) {
    router.push(`/payroll/gaji-sales?periode=${value}`);
  }

  async function handlePay() {
    setError(null);
    if (selectedRows.length === 0) {
      setError("Pilih minimal 1 sales.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/payroll/gaji-sales/bayar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salesIds: selectedRows.map((r) => r.salesId),
          periode,
          tanggal,
          buktiUrl: buktiUrl || undefined,
          catatan: catatan || undefined,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || "Gagal membayar gaji");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membayar gaji");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-2.5">
          <div className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
            Gaji pokok — sales tetap
          </div>
          <Select value={periode} onChange={(e) => changePeriode(e.target.value)} className="w-auto">
            {periodOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-[24px_1.2fr_1fr_150px_190px] gap-4 border-b border-line py-2.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted">
          <span />
          <span>Sales</span>
          <span>Rekening</span>
          <span className="text-right">Gaji Pokok</span>
          <span>Status</span>
        </div>
        {rows.map((r) => {
          const checked = selected.has(r.salesId);
          return (
            <div key={r.salesId} className="grid grid-cols-[24px_1.2fr_1fr_150px_190px] items-center gap-4 border-b border-line py-3.5 text-[0.85rem]">
              <input
                type="checkbox"
                checked={r.sudahDibayar || checked}
                disabled={r.sudahDibayar}
                onChange={() => toggle(r.salesId)}
                className="h-4 w-4 accent-accent"
              />
              <span className="font-semibold">{r.nama}</span>
              <span className="font-mono text-[0.72rem] text-muted">
                {r.bank ? `${r.bank} · ${r.nomorRekening}` : "belum diisi"}
              </span>
              <span className="text-right font-bold">{rupiah(r.gajiPokok)}</span>
              <span
                className={`font-mono text-[0.68rem] font-bold uppercase tracking-wide ${
                  r.sudahDibayar ? "text-muted/60" : r.rekeningTerverifikasi ? "text-ink" : "text-accent"
                }`}
              >
                {r.sudahDibayar ? "Sudah dibayar" : r.rekeningTerverifikasi ? "Siap bayar" : "Rekening belum diverifikasi"}
              </span>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="border-b border-line py-10 text-center font-mono text-sm text-muted">
            Belum ada sales dengan status Tetap. Atur di Admin → Sales.
          </div>
        )}
      </div>

      <div className="flex flex-col border-l-2 border-ink pl-6">
        <div className="border-b-2 border-ink pb-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
          Yang akan terjadi
        </div>
        <div className="border-b border-line py-3 font-sans text-[0.8rem] leading-relaxed">
          <b>1.</b> Terbit {selectedRows.length || 0} bukti bayar gaji pokok, satu per sales, periode {periode}.
        </div>
        <div className="border-b-2 border-ink py-3 font-sans text-[0.8rem] leading-relaxed">
          <b>2.</b> Tercatat di Keuangan sebagai uang keluar <b>{rupiah(total)}</b> tanggal {tanggal || "hari ini"} —
          akun 6400 Beban Gaji.
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <Field label="Tanggal Pembayaran">
            <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </Field>
          <Field label="Bukti Transfer (opsional)">
            <UploadBox folder="payroll" value={buktiUrl} onChange={setBuktiUrl} />
          </Field>
          <Field label="Catatan (opsional)">
            <Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          </Field>
        </div>

        <div className="mt-5 bg-ink px-5 py-5 text-white">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
            Dibayar sekarang
          </div>
          <div className="mt-1.5 font-sans text-[1.75rem] font-extrabold tracking-tight">{rupiah(total)}</div>
        </div>

        {error && <div className="mt-3 font-mono text-[0.75rem] text-danger">{error}</div>}

        <Button onClick={handlePay} disabled={saving || selectedRows.length === 0} className="mt-3.5 justify-center">
          {saving ? "Memproses..." : `Bayar ${selectedRows.length} sales sekarang`}
        </Button>
      </div>
    </div>
  );
}
