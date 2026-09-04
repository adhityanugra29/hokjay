"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import UploadBox from "@/components/ui/UploadBox";
import KomisiPaymentForm from "./KomisiPaymentForm";
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

/** The "Daftar bayar" sheet — checkbox per sales (not per invoice; a "Detail" button pops up the invoice-level breakdown, see detailNama below), rekening + verification status, consequences panel, one-click batch pay. Lives under Payroll's Komisi tab (formerly the standalone /bayar-komisi). */
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
  // Which row's invoice-level detail pop-up is open — per the user's
  // request 2026-09-04 ("detailnya angka komisi ini, detailnya mana? kamu
  // bikin pop-up detail aja... ada basis data yang bisa dipercaya"). A
  // pop-up rather than navigating to /payroll/komisi/[nama] so the batch
  // checkbox selection on this page isn't lost while checking a number.
  const [detailNama, setDetailNama] = useState<string | null>(null);
  const detailRow = rows.find((r) => r.salesNama === detailNama) ?? null;

  const selectedRows = rows.filter((r) => selected.has(r.salesNama));
  const total = selectedRows.reduce((s, r) => s + r.totalKomisi, 0);
  const tertunda = rows.filter((r) => !selected.has(r.salesNama));
  const tertundaTotal = tertunda.reduce((s, r) => s + r.totalKomisi, 0);

  function toggle(nama: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(nama)) next.delete(nama);
      else next.add(nama);
      return next;
    });
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
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-2.5">
          <div className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">Daftar bayar</div>
          <div className="font-mono text-[0.75rem] text-muted">
            {selectedRows.length} dari {rows.length} dipilih
          </div>
        </div>

        <div className="hidden grid-cols-[24px_1.1fr_0.9fr_140px_220px_90px] gap-4 border-b border-line py-2.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted sm:grid">
          <span />
          <span>Sales</span>
          <span>Rekening</span>
          <span className="text-right">Komisi</span>
          <span>Status</span>
          <span />
        </div>
        {rows.map((r) => {
          const checked = selected.has(r.salesNama);
          return (
            <div
              key={r.salesNama}
              className="grid grid-cols-[24px_1fr] items-start gap-x-3 gap-y-1.5 border-b border-line py-3.5 text-[0.85rem] sm:grid-cols-[24px_1.1fr_0.9fr_140px_220px_90px] sm:items-center sm:gap-4"
            >
              <input type="checkbox" checked={checked} onChange={() => toggle(r.salesNama)} className="mt-0.5 h-4 w-4 accent-accent sm:mt-0" />
              <span className="font-semibold">{r.salesNama}</span>
              <span className="col-start-2 font-mono text-[0.72rem] text-muted sm:col-auto">
                {r.bank ? `${r.bank} · ${r.nomorRekening}` : "belum diisi"}
              </span>
              <span className="col-start-2 font-bold sm:col-auto sm:text-right">{rupiah(r.totalKomisi)}</span>
              <span
                className={`col-start-2 font-mono text-[0.68rem] font-bold uppercase tracking-wide whitespace-nowrap sm:col-auto ${
                  r.rekeningTerverifikasi ? "text-muted/60" : "text-accent-700"
                }`}
              >
                {r.rekeningTerverifikasi ? "Siap bayar" : "Rekening belum diverifikasi"}
              </span>
              {/* Own column right next to Status, not squeezed into the
                  Sales cell — per the user's request 2026-09-04. Status'
                  column was widened (150->220) and Detail's own narrowed
                  (110->90) so "Rekening belum diverifikasi" always fits on
                  one line instead of wrapping and throwing the row's
                  vertical alignment off. */}
              <span className="col-start-2 sm:col-auto">
                <button
                  type="button"
                  onClick={() => setDetailNama(r.salesNama)}
                  className="cursor-pointer font-mono text-[0.68rem] text-accent-700 underline underline-offset-2"
                >
                  Detail ({r.invoiceCount})
                </button>
              </span>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="border-b border-line py-10 text-center font-mono text-sm text-muted">
            Semua komisi sudah cair. 🎉
          </div>
        )}
        {rows.length > 0 && (
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-t-2 border-ink py-3.5 font-sans text-[0.9rem] font-extrabold">
            <span>Total dipilih</span>
            <span className="flex items-baseline gap-3">
              {rupiah(total)}
              {tertunda.length > 0 && (
                <span className="font-mono text-[0.7rem] font-medium text-muted">
                  {tertunda.length} ditunda: {rupiah(tertundaTotal)}
                </span>
              )}
            </span>
          </div>
        )}

        {tertunda.length > 0 && (
          <div className="mt-5 border-l-[3px] border-accent bg-[#f7f5ee] p-4 font-sans text-[0.8rem] leading-relaxed">
            <b>{tertunda.map((r) => r.salesNama).join(", ")} ditunda.</b> Nomor rekening belum diverifikasi (atur di
            Admin → Sales). Komisinya tetap tersimpan dan bisa dibayar terpisah, atau centang manual di atas.
          </div>
        )}
      </div>

      <div className="flex flex-col border-l-2 border-ink pl-6">
        <div className="border-b-2 border-ink pb-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
          Yang akan terjadi
        </div>
        <div className="border-b border-line py-3 font-sans text-[0.8rem] leading-relaxed">
          <b>1.</b> Terbit {selectedRows.length || 0} bukti bayar komisi, satu per sales.
        </div>
        <div className="border-b border-line py-3 font-sans text-[0.8rem] leading-relaxed">
          <b>2.</b> Tercatat di Keuangan sebagai uang keluar <b>{rupiah(total)}</b> tanggal {tanggal || "hari ini"}.
        </div>
        <div className="border-b-2 border-ink py-3 font-sans text-[0.8rem] leading-relaxed">
          <b>3.</b> Masuk jurnal Akuntansi ke akun <b>6100 Beban Komisi Sales</b>.
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <Field label="Tanggal Pembayaran">
            <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </Field>
          <Field label="Bukti Transfer (opsional)">
            <UploadBox folder="komisi" value={buktiUrl} onChange={setBuktiUrl} />
          </Field>
          <Field label="Catatan (opsional)">
            <Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          </Field>
        </div>

        <div className="mt-5 bg-ink px-5 py-5 text-white">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
            Dibayar hari ini
          </div>
          <div className="mt-1.5 font-sans text-[1.75rem] font-extrabold tracking-tight">{rupiah(total)}</div>
          <div className="mt-2 font-mono text-[0.72rem] text-white/55">
            Sisa kas setelah bayar: {rupiah(saldoHariIni - total)}
          </div>
        </div>

        {error && <div className="mt-3 font-mono text-[0.75rem] text-danger">{error}</div>}

        <Button onClick={handlePay} disabled={saving || selectedRows.length === 0} className="mt-3.5 justify-center">
          {saving ? "Memproses..." : `Bayar ${selectedRows.length} sales sekarang`}
        </Button>
        <button
          type="button"
          onClick={downloadCsv}
          disabled={selectedRows.length === 0}
          className="mt-2 cursor-pointer border border-line px-4.5 py-2.5 font-sans text-[0.85rem] font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          Unduh daftar transfer (.csv)
        </button>
      </div>

      {/* Detail pop-up — same drawer pattern as EditProductDrawer.tsx, just
          wider (this content is a table, not a form's worth of fields).
          Reuses KomisiPaymentForm as-is (same table + pay button the
          standalone /payroll/komisi/[nama] page uses) so the numbers and
          the payment action are guaranteed to match exactly — no separate
          read-only view that could drift from what actually gets paid. */}
      {detailRow && (
        <div className="no-print fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setDetailNama(null)}>
          <div
            className="flex h-full w-full max-w-3xl flex-col overflow-y-auto bg-panel shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line bg-surface px-5 py-4">
              <div>
                <div className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-muted">Detail Invoice</div>
                <h2 className="font-sans text-[1rem] font-extrabold text-ink">
                  {detailRow.salesNama}
                  <span className="ml-2 font-mono text-[0.72rem] font-normal text-muted">
                    ({detailRow.invoiceCount} invoice)
                  </span>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailNama(null)}
                aria-label="Tutup"
                className="flex h-9 w-9 cursor-pointer items-center justify-center border border-line text-lg text-ink hover:border-accent hover:text-accent-700"
              >
                ✕
              </button>
            </div>
            <div className="p-5">
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
    </div>
  );
}
