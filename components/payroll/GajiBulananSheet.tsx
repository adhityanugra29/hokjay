"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import UploadBox from "@/components/ui/UploadBox";
import { rupiah } from "@/lib/format";
import type { GajiBulananRow } from "@/lib/payroll";

const TIPE_LABEL: Record<GajiBulananRow["tipe"], string> = { sales: "Sales Tetap", karyawan: "Karyawan" };

/**
 * Gaji Sales Tetap + Gaji Karyawan, merged into one batch-pay sheet — same
 * checkbox-batch shape as the old separate sheets, just one combined list.
 * Selected rows are split by `tipe` and posted to their own existing
 * endpoint (the payment logic itself wasn't merged, only this UI).
 */
export default function GajiBulananSheet({
  rows,
  periodOptions,
  periode,
}: {
  rows: GajiBulananRow[];
  periodOptions: string[];
  periode: string;
}) {
  const router = useRouter();
  const belumDibayar = rows.filter((r) => !r.sudahDibayar && r.siapBayar);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(belumDibayar.map((r) => r.id)));
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [buktiUrl, setBuktiUrl] = useState("");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRows = belumDibayar.filter((r) => selected.has(r.id));
  const total = selectedRows.reduce((s, r) => s + r.jumlah, 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function changePeriode(value: string) {
    router.push(`/payroll/gaji?periode=${value}`);
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
      const payload = { periode, tanggal, buktiUrl: buktiUrl || undefined, catatan: catatan || undefined };

      const results = await Promise.all([
        salesIds.length > 0
          ? fetch("/api/payroll/gaji-sales/bayar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...payload, salesIds }),
            })
          : null,
        karyawanIds.length > 0
          ? fetch("/api/payroll/gaji-karyawan/bayar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...payload, karyawanIds }),
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
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-2.5">
          <div className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
            Gaji bulanan — sales tetap & karyawan
          </div>
          <Select value={periode} onChange={(e) => changePeriode(e.target.value)} className="w-auto">
            {periodOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>

        <div className="hidden grid-cols-[24px_1.3fr_1fr_150px_190px] gap-4 border-b border-line py-2.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted sm:grid">
          <span />
          <span>Nama</span>
          <span>Keterangan</span>
          <span className="text-right">Jumlah</span>
          <span>Status</span>
        </div>
        {rows.map((r) => {
          const checked = selected.has(r.id);
          const disabled = r.sudahDibayar || !r.siapBayar;
          return (
            <div
              key={`${r.tipe}-${r.id}`}
              className="grid grid-cols-[24px_1fr] items-start gap-x-3 gap-y-1.5 border-b border-line py-3.5 text-[0.85rem] sm:grid-cols-[24px_1.3fr_1fr_150px_190px] sm:items-center sm:gap-4"
            >
              <input
                type="checkbox"
                checked={r.sudahDibayar || checked}
                disabled={disabled}
                onChange={() => toggle(r.id)}
                className="mt-0.5 h-4 w-4 accent-accent sm:mt-0"
              />
              <span className="font-semibold">
                {r.nama}
                <span className="ml-2 inline-block bg-ink/8 px-1.5 py-0.5 align-middle font-mono text-[9.5px] font-normal uppercase tracking-wide text-muted">
                  {TIPE_LABEL[r.tipe]}
                </span>
              </span>
              <span className="col-start-2 font-mono text-[0.72rem] text-muted sm:col-auto">{r.subtitle}</span>
              <span className="col-start-2 font-bold sm:col-auto sm:text-right">{rupiah(r.jumlah)}</span>
              <span
                className={`col-start-2 font-mono text-[0.68rem] font-bold uppercase tracking-wide sm:col-auto ${
                  r.sudahDibayar ? "text-muted/60" : r.siapBayar ? "text-ink" : "text-accent"
                }`}
              >
                {r.sudahDibayar
                  ? "Sudah dibayar"
                  : r.siapBayar
                    ? "Siap bayar"
                    : r.tipe === "sales"
                      ? "Rekening belum diverifikasi"
                      : "Belum ada absensi"}
              </span>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="border-b border-line py-10 text-center font-mono text-sm text-muted">
            Belum ada sales Tetap atau karyawan aktif. Atur di Admin → Sales, atau tab Karyawan.
          </div>
        )}
      </div>

      <div className="flex flex-col border-l-2 border-ink pl-6">
        <div className="border-b-2 border-ink pb-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
          Yang akan terjadi
        </div>
        <div className="border-b border-line py-3 font-sans text-[0.8rem] leading-relaxed">
          <b>1.</b> Terbit {selectedRows.length || 0} bukti bayar gaji, periode {periode}.
        </div>
        <div className="border-b-2 border-ink py-3 font-sans text-[0.8rem] leading-relaxed">
          <b>2.</b> Tercatat di Keuangan sebagai uang keluar <b>{rupiah(total)}</b> tanggal {tanggal || "hari ini"} —
          akun 6-2100 Beban Gaji.
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
          {saving ? "Memproses..." : `Bayar ${selectedRows.length} orang sekarang`}
        </Button>
      </div>
    </div>
  );
}
