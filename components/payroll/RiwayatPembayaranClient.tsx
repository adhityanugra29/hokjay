"use client";

import { useState } from "react";
import InvoicePdfModal from "@/components/invoice/InvoicePdfModal";
import { StatusPill, bigFigureCls, chipCls, eyebrowCls, factCls, heroCls } from "@/components/payroll/ui";
import { rupiah, formatDateShort } from "@/lib/format";
import { MONTH_NAMES } from "@/lib/constants";
import { periodeLabel as periodeLabelFull } from "@/lib/payrollPeriod";

export interface RiwayatInvoiceRow {
  invoiceId: string;
  nomor: string;
  customerNama: string;
  tanggalLunas: string;
  komisi: number;
}

export interface RiwayatRow {
  key: string;
  tipe: "gaji-sales" | "gaji-karyawan" | "komisi";
  nama: string;
  periode: string;
  total: number;
  tanggalBayar: string;
  dibayarOleh?: string;
  buktiUrl?: string;
  /** Komisi rows only. */
  invoices?: RiwayatInvoiceRow[];
}

const TIPE_LABEL: Record<RiwayatRow["tipe"], string> = {
  "gaji-sales": "Gaji Sales",
  "gaji-karyawan": "Gaji Karyawan",
  komisi: "Komisi",
};

type TipeFilter = "semua" | RiwayatRow["tipe"];

function periodeLabel(periode: string): string {
  const [y, m] = periode.split("-").map(Number);
  if (!y || !m) return periode;
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "short", year: "numeric" });
}

/** YYYY-MM of the payment date, in GMT+7 — the grouping key for the list. */
function payMonth(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 7 * 60 * 60 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function payMonthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/**
 * Riwayat Pembayaran (powers /payroll/riwayat). Redesigned 2026-10-01 to match
 * Komisi Saya (mockup-approved): summary card, search + tipe pills, payments
 * grouped by the month they were paid (with a subtotal), and the Komisi detail
 * drawer. Search/tipe run client-side over the full fetched list (same size
 * class as other admin history views, no pagination needed yet). The period
 * filter is now PayrollNav's shared stepper: `periode` is the selected month
 * ("YYYY-MM", filters on the payment's own periode), or undefined for all
 * periods, which is how this page has always opened. Every column of the old
 * table is still on each row (nama, tipe, periode, total, tanggal bayar,
 * dibayar oleh, bukti, detail).
 */
export default function RiwayatPembayaranClient({ rows, periode }: { rows: RiwayatRow[]; periode?: string }) {
  const [search, setSearch] = useState("");
  const [tipe, setTipe] = useState<TipeFilter>("semua");
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [pdfInvoice, setPdfInvoice] = useState<{ id: string; nomor: string } | null>(null);

  const inPeriode = rows.filter((r) => !periode || r.periode === periode);
  const count = (t: TipeFilter) => inPeriode.filter((r) => t === "semua" || r.tipe === t).length;

  const filtered = inPeriode.filter((r) => {
    if (search && !r.nama.toLowerCase().includes(search.toLowerCase())) return false;
    if (tipe !== "semua" && r.tipe !== tipe) return false;
    return true;
  });

  const total = filtered.reduce((s, r) => s + r.total, 0);
  const gajiTotal = filtered.filter((r) => r.tipe !== "komisi").reduce((s, r) => s + r.total, 0);
  const komisiTotal = total - gajiTotal;

  const groupMap = new Map<string, RiwayatRow[]>();
  for (const r of filtered) {
    const k = payMonth(r.tanggalBayar);
    groupMap.set(k, [...(groupMap.get(k) ?? []), r]);
  }
  const groups = [...groupMap.entries()];

  const detailRow = rows.find((r) => r.key === detailKey) ?? null;

  return (
    <>
      <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
        <section className={heroCls}>
          <div className={eyebrowCls}>Total dibayar {periode ? periodeLabelFull(periode) : "semua periode"}</div>
          <div className={bigFigureCls}>{rupiah(total)}</div>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <span className={factCls}>
              Gaji <b className="font-extrabold text-ink">{rupiah(gajiTotal)}</b>
            </span>
            <span className={factCls}>
              Komisi <b className="font-extrabold text-ink">{rupiah(komisiTotal)}</b>
            </span>
            <span className={factCls}>
              <b className="font-extrabold text-ink">{filtered.length}</b> pembayaran
            </span>
          </div>
        </section>

        <section className="min-w-0 rounded-2xl bg-panel shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 pb-2 pt-3.5 md:px-5">
            <h2 className="font-sans text-[0.98rem] font-extrabold">Riwayat pembayaran</h2>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama"
              aria-label="Cari nama"
              className="w-full rounded-full border border-line bg-panel px-4 py-2 font-sans text-[0.8rem] text-ink placeholder:text-muted sm:w-[260px]"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto px-4 pb-2 md:px-5" role="group" aria-label="Filter tipe">
            {(
              [
                ["semua", "Semua"],
                ["gaji-sales", "Gaji Sales"],
                ["gaji-karyawan", "Gaji Karyawan"],
                ["komisi", "Komisi"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTipe(key)}
                aria-pressed={tipe === key}
                className={`shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 font-sans text-[0.8rem] font-bold ${
                  tipe === key ? "bg-ink text-paper" : "bg-surface text-muted hover:text-ink"
                }`}
              >
                {label}
                <span className="ml-1 opacity-70">{count(key)}</span>
              </button>
            ))}
          </div>

          <div className="px-4 pb-2 md:px-5">
            {groups.map(([key, items]) => (
              <div key={key}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 pb-1.5 pt-3.5 font-sans text-[11.5px] text-muted">
                  <b className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-accent-700">
                    Dibayar {payMonthLabel(key)}
                  </b>
                  <span>
                    {items.length} pembayaran · {rupiah(items.reduce((s, r) => s + r.total, 0))}
                  </span>
                </div>
                {items.map((r) => {
                  const d = new Date(new Date(r.tanggalBayar).getTime() + 7 * 60 * 60 * 1000);
                  const mon = payMonthLabel(payMonth(r.tanggalBayar)).slice(0, 3);
                  return (
                    <div
                      key={r.key}
                      className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-t border-line py-3 first:border-t-0 md:grid-cols-[52px_minmax(0,1fr)_auto_auto] md:gap-x-4"
                    >
                      <span className="rounded-[10px] bg-[#d7f2e6] py-1.5 text-center leading-none text-[#087a52]">
                        <b className="block font-sans text-[1.05rem] font-black">{d.getUTCDate()}</b>
                        <i className="font-sans text-[10px] font-bold uppercase not-italic">{mon}</i>
                      </span>
                      <div className="flex min-w-0 flex-col gap-1">
                        <b className="font-sans text-[0.92rem] font-extrabold wrap-anywhere">{r.nama}</b>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[11.5px] text-muted">
                          <StatusPill tone={r.tipe === "komisi" ? "warn" : "tag"}>{TIPE_LABEL[r.tipe]}</StatusPill>
                          <span>
                            Periode {periodeLabel(r.periode)} · dibayar oleh {r.dibayarOleh ?? "—"}
                          </span>
                        </div>
                      </div>
                      <b className="whitespace-nowrap text-right font-sans text-[0.95rem] font-extrabold">{rupiah(r.total)}</b>
                      <div className="col-span-3 flex flex-wrap gap-1.5 pl-[60px] md:col-span-1 md:min-w-[150px] md:justify-end md:pl-0">
                        {r.buktiUrl ? (
                          <a href={r.buktiUrl} target="_blank" rel="noreferrer" className={chipCls}>
                            Lihat bukti
                          </a>
                        ) : (
                          <span className="px-1 py-1 font-sans text-[11.5px] text-muted">Tanpa bukti</span>
                        )}
                        {r.invoices && r.invoices.length > 0 && (
                          <button type="button" onClick={() => setDetailKey(r.key)} className={chipCls}>
                            {r.invoices.length} invoice &rsaquo;
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            {groups.length === 0 && (
              <div className="py-8 text-center font-sans text-[0.85rem] text-muted">Belum ada riwayat pembayaran.</div>
            )}
          </div>
        </section>
      </div>

      {detailRow && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setDetailKey(null)}>
          <div
            className="flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-panel shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <div className="font-sans text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Detail invoice</div>
                <h2 className="font-sans text-[1.02rem] font-extrabold wrap-anywhere">
                  {detailRow.nama}
                  <span className="ml-2 font-sans text-[0.75rem] font-medium text-muted">
                    ({detailRow.invoices?.length ?? 0} invoice)
                  </span>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailKey(null)}
                aria-label="Tutup"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface text-base text-ink hover:bg-line"
              >
                &#10005;
              </button>
            </div>
            <div className="flex flex-col gap-1 px-5 pb-5 pt-3">
              <div className="pb-1 font-sans text-[12px] text-muted">
                Dibayar {formatDateShort(detailRow.tanggalBayar)}. Komisi dicairkan bersamaan untuk invoice berikut.
              </div>
              {detailRow.invoices?.map((inv) => (
                <div
                  key={inv.invoiceId}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-line py-3 first:border-t-0"
                >
                  <div className="min-w-0">
                    <div className="font-sans text-[0.88rem] font-bold wrap-anywhere">{inv.customerNama}</div>
                    <div className="font-sans text-[11px] text-muted">
                      <button
                        type="button"
                        onClick={() => setPdfInvoice({ id: inv.invoiceId, nomor: inv.nomor })}
                        aria-label={`Buka PDF invoice ${inv.nomor}`}
                        className="cursor-pointer font-mono font-bold text-accent-700 underline underline-offset-2"
                      >
                        {inv.nomor}
                      </button>{" "}
                      · lunas {formatDateShort(inv.tanggalLunas)}
                    </div>
                  </div>
                  <b className="whitespace-nowrap font-sans text-[0.9rem] font-extrabold">{rupiah(inv.komisi)}</b>
                </div>
              ))}
              <div className="mt-2 flex items-baseline justify-between border-t border-line pt-3 font-sans text-[0.85rem] font-bold">
                <span>Total komisi</span>
                <span className="text-[1.05rem] font-extrabold">{rupiah(detailRow.total)}</span>
              </div>
              {detailRow.buktiUrl && (
                <a href={detailRow.buktiUrl} target="_blank" rel="noreferrer" className={`${chipCls} mt-2 self-start`}>
                  Lihat bukti transfer
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {pdfInvoice && (
        <InvoicePdfModal invoiceId={pdfInvoice.id} nomor={pdfInvoice.nomor} onClose={() => setPdfInvoice(null)} />
      )}
    </>
  );
}
