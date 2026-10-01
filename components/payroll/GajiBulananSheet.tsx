"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Textarea } from "@/components/ui/Form";
import UploadBox from "@/components/ui/UploadBox";
import { Avatar, PayCheckbox, StatusPill, bigFigureCls, eyebrowCls, factCls, heroCls } from "@/components/payroll/ui";
import { rupiah } from "@/lib/format";
import { periodeLabel } from "@/lib/payrollPeriod";
import type { GajiBulananRow } from "@/lib/payroll";

const TIPE_LABEL: Record<GajiBulananRow["tipe"], string> = { sales: "Sales Tetap", karyawan: "Karyawan" };
type Filter = "semua" | GajiBulananRow["tipe"];

const labelCls = "mb-1 block font-sans text-[11.5px] font-bold text-muted";
const payBtnCls =
  "min-h-[46px] w-full cursor-pointer items-center justify-center rounded-full border border-accent bg-accent px-5 py-2.5 font-sans text-[0.92rem] font-extrabold text-ink transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-45";

function statusOf(r: GajiBulananRow): { tone: "ok" | "warn" | "tag"; label: string } {
  if (r.sudahDibayar) return { tone: "ok", label: "Sudah dibayar" };
  if (r.siapBayar) return { tone: "tag", label: "Siap bayar" };
  return { tone: "warn", label: r.tipe === "sales" ? "Rekening belum diverifikasi" : "Belum ada absensi" };
}

/**
 * Gaji Sales Tetap + Gaji Karyawan, merged into one batch-pay sheet — same
 * checkbox-batch shape as the old separate sheets, just one combined list.
 * Selected rows are split by `tipe` and posted to their own existing
 * endpoint (the payment logic itself wasn't merged, only this UI).
 *
 * Redesigned 2026-10-01 to match Komisi Saya (mockup-approved): one
 * responsive tree replaces the old desktop sheet + MobileGajiBulanan pair.
 * The month comes from PayrollNav's shared stepper (`periode` prop), so
 * there is no month picker here. Summary card on top (total, sales/karyawan
 * split, paid progress), rounded list with a tipe filter, pay panel on the
 * right from lg up; on phones the total + pay button sit in a sticky bottom
 * bar and the date/bukti/catatan fields fold behind "Detail pembayaran".
 */
export default function GajiBulananSheet({
  rows,
  periode,
  kasSekarang,
}: {
  rows: GajiBulananRow[];
  periode: string;
  kasSekarang: number;
}) {
  const router = useRouter();
  const belumDibayar = rows.filter((r) => !r.sudahDibayar && r.siapBayar);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(belumDibayar.map((r) => r.id)));
  const [filter, setFilter] = useState<Filter>("semua");
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [buktiUrl, setBuktiUrl] = useState("");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const selectedRows = belumDibayar.filter((r) => selected.has(r.id));
  const total = selectedRows.reduce((s, r) => s + r.jumlah, 0);
  const sisaKas = kasSekarang - total;

  const grand = rows.reduce((s, r) => s + r.jumlah, 0);
  const salesTotal = rows.filter((r) => r.tipe === "sales").reduce((s, r) => s + r.jumlah, 0);
  const karyawanTotal = grand - salesTotal;
  const paid = rows.filter((r) => r.sudahDibayar).reduce((s, r) => s + r.jumlah, 0);
  const pct = grand > 0 ? Math.round((paid / grand) * 100) : 0;
  const semuaLunas = rows.length > 0 && rows.every((r) => r.sudahDibayar);

  const count = (f: Filter) => rows.filter((r) => f === "semua" || r.tipe === f).length;
  const shown = rows.filter((r) => filter === "semua" || r.tipe === filter);

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
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_372px] lg:items-start lg:gap-5">
        <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
          <section className={heroCls}>
            <div className={eyebrowCls}>Total gaji {periodeLabel(periode)}</div>
            <div className={bigFigureCls}>{rupiah(grand)}</div>
            <div className="mt-3.5 flex flex-wrap gap-2">
              <span className={factCls}>
                Sales tetap <b className="font-extrabold text-ink">{rupiah(salesTotal)}</b>
              </span>
              <span className={factCls}>
                Karyawan <b className="font-extrabold text-ink">{rupiah(karyawanTotal)}</b>
              </span>
            </div>
            <div
              className="mt-3.5 h-2 overflow-hidden rounded-full bg-line"
              role="img"
              aria-label={`${pct} persen sudah dibayar`}
            >
              <div className="h-full rounded-full bg-[#087a52]" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 font-sans text-[12px] text-muted">
              <span>
                Sudah dibayar <b className="text-ink">{rupiah(paid)}</b>
              </span>
              <span>
                Sisa <b className="text-ink">{rupiah(grand - paid)}</b>
              </span>
            </div>
          </section>

          <section className="min-w-0 rounded-2xl bg-panel shadow-sm">
            <div className="px-4 pb-2 pt-3.5 md:px-5">
              <h2 className="font-sans text-[0.98rem] font-extrabold">Daftar bayar</h2>
              <div className="font-sans text-[12px] text-muted">
                {selectedRows.length} dari {belumDibayar.length} siap bayar dipilih · {rupiah(total)}
              </div>
            </div>
            <div className="flex gap-1.5 overflow-x-auto px-4 pb-2 md:px-5" role="group" aria-label="Filter tipe">
              {(
                [
                  ["semua", "Semua"],
                  ["sales", "Sales Tetap"],
                  ["karyawan", "Karyawan"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  aria-pressed={filter === key}
                  className={`shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 font-sans text-[0.8rem] font-bold ${
                    filter === key ? "bg-ink text-paper" : "bg-surface text-muted hover:text-ink"
                  }`}
                >
                  {label}
                  <span className="ml-1 opacity-70">{count(key)}</span>
                </button>
              ))}
            </div>

            <div className="px-4 pb-1 md:px-5">
              {shown.map((r) => {
                const disabled = r.sudahDibayar || !r.siapBayar;
                const st = statusOf(r);
                return (
                  <div
                    key={`${r.tipe}-${r.id}`}
                    className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-line py-3.5 first:border-t-0 md:grid-cols-[auto_40px_minmax(0,1fr)_auto] ${
                      !r.sudahDibayar && !r.siapBayar ? "opacity-70" : ""
                    }`}
                  >
                    <PayCheckbox
                      checked={r.sudahDibayar || selected.has(r.id)}
                      disabled={disabled}
                      onChange={() => toggle(r.id)}
                      aria-label={`Pilih ${r.nama}`}
                    />
                    <div className="hidden md:block">
                      <Avatar nama={r.nama} />
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <b className="font-sans text-[0.92rem] font-extrabold wrap-anywhere">{r.nama}</b>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[11.5px] text-muted">
                        <StatusPill tone="tag">{TIPE_LABEL[r.tipe]}</StatusPill>
                        <span className="wrap-anywhere">{r.subtitle}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 text-right">
                      <b className="whitespace-nowrap font-sans text-[0.95rem] font-extrabold">{rupiah(r.jumlah)}</b>
                      <StatusPill tone={st.tone}>{st.label}</StatusPill>
                    </div>
                  </div>
                );
              })}
              {rows.length === 0 && (
                <div className="py-8 text-center font-sans text-[0.85rem] text-muted">
                  Belum ada sales Tetap atau karyawan aktif. Atur di Admin → Sales, atau tab Karyawan.
                </div>
              )}
              {rows.length > 0 && shown.length === 0 && (
                <div className="py-8 text-center font-sans text-[0.85rem] text-muted">Tidak ada orang di kelompok ini.</div>
              )}
            </div>
          </section>
        </div>

        <aside aria-label="Pembayaran" className="flex flex-col gap-3.5 rounded-2xl bg-panel p-4 shadow-sm lg:sticky lg:top-4">
          <div className="rounded-xl bg-ink px-4 py-4 text-white">
            <div className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
              Dibayar sekarang
            </div>
            <div className="mt-1 font-sans text-[1.75rem] font-extrabold tracking-tight">{rupiah(total)}</div>
            <div className="mt-2.5 grid grid-cols-[1fr_auto_1fr] items-center gap-2.5 border-t border-white/15 pt-2.5 font-sans text-[11px] text-white/60">
              <span>
                Kas sebelum
                <b className="block text-[0.85rem] font-extrabold text-white">{rupiah(kasSekarang)}</b>
              </span>
              <span aria-hidden="true">→</span>
              <span className="text-right">
                Kas sesudah
                <b className={`block text-[0.85rem] font-extrabold ${sisaKas < 0 ? "text-[#ff8a7a]" : "text-white"}`}>
                  {rupiah(sisaKas)}
                </b>
              </span>
            </div>
          </div>

          {semuaLunas && (
            <div className="rounded-xl bg-accent-100 p-3 font-sans text-[12.5px]">
              Semua gaji periode ini sudah dibayar. Bukti pembayaran ada di tab Riwayat.
            </div>
          )}

          <button
            type="button"
            onClick={() => setDetailOpen((v) => !v)}
            aria-expanded={detailOpen}
            className="flex cursor-pointer items-center justify-between rounded-xl bg-surface px-4 py-2.5 text-left font-sans text-[0.82rem] font-extrabold lg:hidden"
          >
            Detail pembayaran
            <span className={`text-muted transition-transform ${detailOpen ? "rotate-180" : ""}`} aria-hidden="true">
              ▾
            </span>
          </button>

          <div className={`${detailOpen ? "flex" : "hidden"} flex-col gap-3.5 lg:flex`}>
            <div className="rounded-xl bg-surface px-4 py-3 font-sans text-[12.5px] leading-relaxed text-muted">
              <div className="mb-1 font-sans text-[12.5px] font-extrabold text-ink">Yang akan terjadi</div>
              <ol className="m-0 list-decimal pl-4">
                <li>
                  Terbit <b className="text-ink">{selectedRows.length || 0}</b> bukti bayar gaji, periode {periode}.
                </li>
                <li>
                  Tercatat di Keuangan sebagai uang keluar <b className="text-ink">{rupiah(total)}</b> tanggal{" "}
                  {tanggal || "hari ini"} — akun <b className="text-ink">6-2100 Beban Gaji</b>.
                </li>
              </ol>
            </div>
            <div>
              <label htmlFor="gaji-tanggal" className={labelCls}>
                Tanggal pembayaran
              </label>
              <Input id="gaji-tanggal" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
            <div>
              <span className={labelCls}>Bukti transfer (opsional)</span>
              <UploadBox folder="payroll" value={buktiUrl} onChange={setBuktiUrl} />
            </div>
            <div>
              <label htmlFor="gaji-catatan" className={labelCls}>
                Catatan (opsional)
              </label>
              <Textarea id="gaji-catatan" rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
            </div>
          </div>

          {error && <div className="font-sans text-[0.78rem] text-danger">{error}</div>}

          <button
            type="button"
            onClick={handlePay}
            disabled={saving || selectedRows.length === 0}
            className={`${payBtnCls} hidden lg:flex`}
          >
            {saving ? "Memproses..." : `Bayar ${selectedRows.length} orang sekarang`}
          </button>
        </aside>
      </div>

      {/* Phones: total + pay button always in reach, above the bottom tab bar (58px). */}
      {rows.length > 0 && (
        <div className="sticky bottom-[58px] z-10 -mx-6 mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-line bg-panel px-4 py-3 shadow-[0_-6px_18px_rgba(36,31,25,0.08)] md:-mx-9 lg:hidden">
          <div className="font-sans text-[11.5px] text-muted">
            {selectedRows.length} orang dipilih
            <b className="block font-sans text-[1.15rem] font-black tracking-tight text-ink">{rupiah(total)}</b>
          </div>
          <button
            type="button"
            onClick={handlePay}
            disabled={saving || selectedRows.length === 0}
            className={`${payBtnCls} flex !w-auto min-w-[150px]`}
          >
            {saving ? "Memproses..." : `Bayar ${selectedRows.length} orang`}
          </button>
          <div className="col-span-2 font-sans text-[11.5px] text-muted">
            Sisa kas setelah bayar <b className={sisaKas < 0 ? "text-danger" : "text-ink"}>{rupiah(sisaKas)}</b>
          </div>
        </div>
      )}
    </>
  );
}
