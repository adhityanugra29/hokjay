"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Textarea } from "@/components/ui/Form";
import UploadBox from "@/components/ui/UploadBox";
import KomisiPaymentForm from "./KomisiPaymentForm";
import { Avatar, PayCheckbox, StatusPill, bigFigureCls, chipCls, eyebrowCls, factCls, heroCls } from "@/components/payroll/ui";
import { rupiah } from "@/lib/format";
import type { UnpaidCommissionInvoice } from "@/lib/insentif";

interface SheetRow {
  salesNama: string;
  invoiceIds: string[];
  /** Invoice-level breakdown backing totalKomisi — powers the Detail pop-up. */
  detail: UnpaidCommissionInvoice[];
  totalKomisi: number;
  invoiceCount: number;
  bank?: string;
  nomorRekening?: string;
  rekeningTerverifikasi: boolean;
}

const labelCls = "mb-1 block font-sans text-[11.5px] font-bold text-muted";
const payBtnCls =
  "min-h-[46px] w-full cursor-pointer items-center justify-center rounded-full border border-accent bg-accent px-5 py-2.5 font-sans text-[0.92rem] font-extrabold text-ink transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-45";

/**
 * The "Daftar bayar" sheet — one checkbox per sales (not per invoice; the
 * "Detail" chip opens the invoice-level breakdown in a drawer), rekening +
 * verification status, a pay panel with the consequences, one-click batch
 * pay. Lives under Payroll's Komisi tab (formerly the standalone
 * /bayar-komisi). Redesigned 2026-10-01 to match Komisi Saya's look (mockup-
 * approved): summary card on top, rounded list, pay panel on the right from
 * lg up; on phones the total + pay button move to a sticky bottom bar and
 * the date/bukti/catatan fields fold behind "Detail pembayaran". Payment and
 * CSV logic unchanged. Deliberately no month filter — unpaid commission is a
 * running balance, a month filter could hide commission that never got paid.
 */
export default function BayarKomisiSheet({ rows, saldoHariIni }: { rows: SheetRow[]; saldoHariIni: number }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(rows.filter((r) => r.rekeningTerverifikasi).map((r) => r.salesNama))
  );
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [buktiUrl, setBuktiUrl] = useState("");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Phones only: whether the pay panel's steps + fields are unfolded (from lg
  // up they are always shown, see the `lg:` classes below).
  const [detailOpen, setDetailOpen] = useState(false);
  // Which row's invoice-level detail pop-up is open — per the user's
  // request 2026-09-04. A pop-up rather than navigating to
  // /payroll/komisi/[nama] so the batch checkbox selection on this page
  // isn't lost while checking a number.
  const [detailNama, setDetailNama] = useState<string | null>(null);
  const detailRow = rows.find((r) => r.salesNama === detailNama) ?? null;

  const selectedRows = rows.filter((r) => selected.has(r.salesNama));
  const total = selectedRows.reduce((s, r) => s + r.totalKomisi, 0);
  const tertunda = rows.filter((r) => !selected.has(r.salesNama));
  const tertundaTotal = tertunda.reduce((s, r) => s + r.totalKomisi, 0);
  const grandTotal = rows.reduce((s, r) => s + r.totalKomisi, 0);
  const invoiceTotal = rows.reduce((s, r) => s + r.invoiceCount, 0);
  const sisaKas = saldoHariIni - total;

  function toggle(nama: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(nama)) next.delete(nama);
      else next.add(nama);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.salesNama))));
  }

  function downloadCsv() {
    const header = "Sales,Bank,Nomor Rekening,Komisi\n";
    const body = selectedRows
      .map((r) => `"${r.salesNama}","${r.bank ?? ""}","${r.nomorRekening ?? ""}",${r.totalKomisi}`)
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daftar-transfer-komisi_${tanggal}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handlePay() {
    setError(null);
    if (selectedRows.length === 0) {
      setError("Pilih minimal 1 sales.");
      return;
    }
    setSaving(true);
    try {
      const invoiceIds = selectedRows.flatMap((r) => r.invoiceIds);
      const res = await fetch("/api/insentif/bayar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceIds, tanggal, buktiUrl: buktiUrl || undefined, catatan: catatan || undefined }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || "Gagal memproses pembayaran komisi");
      }
      router.push("/payroll");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses pembayaran komisi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_372px] lg:items-start lg:gap-5">
        <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
          <section className={heroCls}>
            <div className={eyebrowCls}>Komisi menunggu dibayar</div>
            <div className={bigFigureCls}>{rupiah(grandTotal)}</div>
            <p className="mt-1 max-w-[50ch] font-sans text-[12.5px] leading-snug text-muted">
              Semua komisi dari invoice lunas yang belum ditransfer, tanpa batas bulan supaya tidak ada yang terlewat.
            </p>
            <div className="mt-3.5 flex flex-wrap gap-2">
              <span className={factCls}>
                <b className="font-extrabold text-ink">{rows.length}</b> sales
              </span>
              <span className={factCls}>
                <b className="font-extrabold text-ink">{invoiceTotal}</b> invoice lunas
              </span>
              <span className={factCls}>
                Saldo kas hari ini <b className="font-extrabold text-ink">{rupiah(saldoHariIni)}</b>
              </span>
            </div>
          </section>

          <section className="min-w-0 rounded-2xl bg-panel shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2 pt-3.5 md:px-5">
              <div>
                <h2 className="font-sans text-[0.98rem] font-extrabold">Daftar bayar</h2>
                <div className="font-sans text-[12px] text-muted">
                  {selectedRows.length} dari {rows.length} dipilih · {rupiah(total)}
                </div>
              </div>
              {rows.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="cursor-pointer font-sans text-[0.75rem] font-bold text-accent-700 underline underline-offset-2"
                >
                  {selected.size === rows.length ? "Kosongkan pilihan" : "Pilih semua"}
                </button>
              )}
            </div>

            <div className="px-4 pb-1 md:px-5">
              {rows.map((r) => (
                <div
                  key={r.salesNama}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-line py-3.5 first:border-t-0 md:grid-cols-[auto_40px_minmax(0,1fr)_auto]"
                >
                  <PayCheckbox
                    checked={selected.has(r.salesNama)}
                    onChange={() => toggle(r.salesNama)}
                    aria-label={`Pilih ${r.salesNama}`}
                  />
                  <div className="hidden md:block">
                    <Avatar nama={r.salesNama} />
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <b className="font-sans text-[0.92rem] font-extrabold wrap-anywhere">{r.salesNama}</b>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[11.5px] text-muted">
                      <span>{r.bank ? `${r.bank} · ${r.nomorRekening}` : "Rekening belum diisi"}</span>
                      <StatusPill tone={r.rekeningTerverifikasi ? "ok" : "warn"}>
                        {r.rekeningTerverifikasi ? "Siap bayar" : "Rekening belum diverifikasi"}
                      </StatusPill>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 text-right">
                    <b className="whitespace-nowrap font-sans text-[0.95rem] font-extrabold">{rupiah(r.totalKomisi)}</b>
                    <button type="button" onClick={() => setDetailNama(r.salesNama)} className={chipCls}>
                      Detail · {r.invoiceCount} invoice
                    </button>
                  </div>
                </div>
              ))}
              {rows.length === 0 && (
                <div className="py-8 text-center font-sans text-[0.85rem] text-muted">Semua komisi sudah cair. 🎉</div>
              )}
            </div>

            {tertunda.length > 0 && (
              <div className="mx-4 mb-4 mt-1 rounded-xl bg-accent-100 p-3.5 font-sans text-[12.5px] leading-relaxed md:mx-5">
                <b>{tertunda.map((r) => r.salesNama).join(", ")} ditunda.</b> Komisinya {rupiah(tertundaTotal)} tetap
                tersimpan dan bisa dibayar terpisah. Nomor rekening yang belum terverifikasi diatur di Admin → Sales,
                atau centang manual di atas.
              </div>
            )}
          </section>
        </div>

        <aside aria-label="Pembayaran" className="flex flex-col gap-3.5 rounded-2xl bg-panel p-4 shadow-sm lg:sticky lg:top-4">
          <div className="rounded-xl bg-ink px-4 py-4 text-white">
            <div className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
              Dibayar hari ini
            </div>
            <div className="mt-1 font-sans text-[1.75rem] font-extrabold tracking-tight">{rupiah(total)}</div>
            <div className="mt-2.5 border-t border-white/15 pt-2.5 font-sans text-[11.5px] text-white/60">
              Sisa kas setelah bayar{" "}
              <b className={`ml-1 text-[0.85rem] ${sisaKas < 0 ? "text-[#ff8a7a]" : "text-white"}`}>{rupiah(sisaKas)}</b>
            </div>
          </div>

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
                  Terbit <b className="text-ink">{selectedRows.length || 0}</b> bukti bayar komisi, satu per sales.
                </li>
                <li>
                  Tercatat di Keuangan sebagai uang keluar <b className="text-ink">{rupiah(total)}</b> tanggal{" "}
                  {tanggal || "hari ini"}.
                </li>
                <li>
                  Masuk jurnal Akuntansi ke akun <b className="text-ink">6100 Beban Komisi Sales</b>.
                </li>
              </ol>
            </div>
            <div>
              <label htmlFor="bayar-tanggal" className={labelCls}>
                Tanggal pembayaran
              </label>
              <Input id="bayar-tanggal" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
            <div>
              <span className={labelCls}>Bukti transfer (opsional)</span>
              <UploadBox folder="komisi" value={buktiUrl} onChange={setBuktiUrl} />
            </div>
            <div>
              <label htmlFor="bayar-catatan" className={labelCls}>
                Catatan (opsional)
              </label>
              <Textarea id="bayar-catatan" rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
            </div>
          </div>

          {error && <div className="font-sans text-[0.78rem] text-danger">{error}</div>}

          <button
            type="button"
            onClick={handlePay}
            disabled={saving || selectedRows.length === 0}
            className={`${payBtnCls} hidden lg:flex`}
          >
            {saving ? "Memproses..." : `Bayar ${selectedRows.length} sales sekarang`}
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={selectedRows.length === 0}
            className="min-h-[40px] cursor-pointer rounded-full border border-line px-4 py-2 font-sans text-[0.85rem] font-bold text-ink transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
          >
            Unduh daftar transfer (.csv)
          </button>
        </aside>
      </div>

      {/* Phones: total + pay button always in reach, above the bottom tab bar (58px). */}
      {rows.length > 0 && (
        <div className="sticky bottom-[58px] z-10 -mx-6 mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-line bg-panel px-4 py-3 shadow-[0_-6px_18px_rgba(36,31,25,0.08)] md:-mx-9 lg:hidden">
          <div className="font-sans text-[11.5px] text-muted">
            {selectedRows.length} sales dipilih
            <b className="block font-sans text-[1.15rem] font-black tracking-tight text-ink">{rupiah(total)}</b>
          </div>
          <button
            type="button"
            onClick={handlePay}
            disabled={saving || selectedRows.length === 0}
            className={`${payBtnCls} flex !w-auto min-w-[150px]`}
          >
            {saving ? "Memproses..." : `Bayar ${selectedRows.length} sales`}
          </button>
          <div className="col-span-2 font-sans text-[11.5px] text-muted">
            Sisa kas setelah bayar <b className={sisaKas < 0 ? "text-danger" : "text-ink"}>{rupiah(sisaKas)}</b>
          </div>
        </div>
      )}

      {/* Detail pop-up — same drawer pattern as EditProductDrawer.tsx, just
          wider (this content is a list + form, not a form's worth of fields).
          Reuses KomisiPaymentForm as-is (same list + pay button the
          standalone /payroll/komisi/[nama] page uses) so the numbers and
          the payment action are guaranteed to match exactly — no separate
          read-only view that could drift from what actually gets paid. */}
      {detailRow && (
        <div className="no-print fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setDetailNama(null)}>
          <div
            className="flex h-full w-full max-w-3xl flex-col overflow-y-auto bg-paper shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-line bg-panel px-5 py-4">
              <div className="min-w-0">
                <div className="font-sans text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Detail invoice</div>
                <h2 className="font-sans text-[1.02rem] font-extrabold wrap-anywhere">
                  {detailRow.salesNama}
                  <span className="ml-2 font-sans text-[0.75rem] font-medium text-muted">
                    ({detailRow.invoiceCount} invoice)
                  </span>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailNama(null)}
                aria-label="Tutup"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface text-base text-ink hover:bg-line"
              >
                ✕
              </button>
            </div>
            <div className="p-4 md:p-5">
              <KomisiPaymentForm
                salesNama={detailRow.salesNama}
                invoices={detailRow.detail}
                onCancel={() => setDetailNama(null)}
                onSuccess={() => {
                  setDetailNama(null);
                  router.refresh();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
