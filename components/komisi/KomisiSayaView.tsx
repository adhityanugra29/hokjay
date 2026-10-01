"use client";

import { useState } from "react";
import Link from "next/link";
import FollowUpStatusBadge from "@/components/dashboard/FollowUpStatusBadge";
import { rupiah, formatDateShort } from "@/lib/format";
import { MONTH_NAMES } from "@/lib/constants";
import type { MyKomisiInvoiceRow, MyKomisiOverview, MyKomisiPayoutRow } from "@/lib/insentif";

function asalLabel(asal: string): string {
  const m = Number(asal.split("-")[1]);
  return MONTH_NAMES[m - 1] ?? asal;
}

/**
 * Body of "Komisi Saya" (redesign 2026-10-01, mockup-approved). Two statuses,
 * named by the user: "Komisi Siap Cair" (invoice lunas, commission not yet
 * transferred) is the one big figure; "Komisi Tertunda" (invoice still
 * unpaid) is a small secondary line and its own tab, never added into the
 * big figure so it can't read as money already earned. Commission that has
 * already been transferred has no figure of its own — it's in the payout
 * history for the selected month.
 *
 * Layout is one responsive tree rather than a separate Mobile* variant: a
 * single column below lg (what Sales sees on a phone), hero+invoices left /
 * history right from lg up. The server page remounts this per period
 * (key={period}) so the tab/expanded-row state resets when the month changes.
 */
export default function KomisiSayaView({ data, periodLabel }: { data: MyKomisiOverview; periodLabel: string }) {
  const [tab, setTab] = useState<"siap" | "belum">("siap");
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    data.payouts[0] ? { [data.payouts[0].key]: true } : {}
  );

  const rows = tab === "siap" ? data.siapCairInvoices : data.belumLunasInvoices;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] lg:items-start lg:gap-5">
      <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
        <section className="rounded-2xl bg-linear-to-br from-accent-100 to-panel p-4 shadow-lg shadow-accent-700/15 md:p-5">
          <div className="font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-accent-700">
            Komisi Siap Cair
          </div>
          <div className="mt-1 font-sans text-[clamp(1.9rem,8vw,2.5rem)] font-black leading-tight tracking-tight">
            {rupiah(data.siapCair)}
          </div>
          <p className="mt-1 max-w-[46ch] font-sans text-[12px] leading-snug text-muted">
            Invoice sudah lunas, komisinya belum ditransfer ke kamu. Posisi sampai akhir {periodLabel}.
          </p>
          <div className="mt-3.5 flex items-start gap-2 font-sans text-[11.5px] leading-snug text-muted">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-line" />
            <span>
              <b className="font-bold text-ink">Komisi Tertunda {rupiah(data.belumLunasTotal)}</b> ·{" "}
              {data.belumLunasInvoices.length > 0
                ? `${data.belumLunasInvoices.length} invoice masih menunggu lunas`
                : "tidak ada invoice yang menunggu lunas"}
              . Belum dihitung di angka atas.
            </span>
          </div>
        </section>

        <section className="min-w-0 rounded-2xl bg-panel shadow-sm">
          <div className="flex gap-1.5 px-4 pt-3" role="group" aria-label="Status invoice">
            {(
              [
                ["siap", "Komisi Siap Cair", data.siapCairInvoices.length],
                ["belum", "Komisi Tertunda", data.belumLunasInvoices.length],
              ] as const
            ).map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                aria-pressed={tab === key}
                className={`cursor-pointer rounded-full px-3.5 py-1.5 font-sans text-[0.8rem] font-bold ${
                  tab === key ? "bg-ink text-paper" : "bg-surface text-muted hover:text-ink"
                }`}
              >
                {label}
                <span className="ml-1 opacity-70">{count}</span>
              </button>
            ))}
          </div>

          {rows.length > 0 ? (
            <div className="px-4 pb-1 pt-1.5">
              {rows.map((row) => (
                <InvoiceRow key={row.invoiceId} row={row} />
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-center font-sans text-[0.85rem] text-muted">
              {tab === "siap"
                ? "Tidak ada komisi yang menunggu transfer. Semua komisi dari invoice lunas sudah ditransfer ke kamu."
                : "Tidak ada invoice yang menunggu pembayaran pelanggan."}
            </div>
          )}

          {tab === "belum" && rows.length > 0 && (
            <p className="px-4 pb-4 pt-1 font-sans text-[12px] text-muted">
              Komisi {rupiah(data.belumLunasTotal)} ini menjadi Komisi Siap Cair setelah invoicenya lunas.
            </p>
          )}
          {tab === "siap" && rows.length > 0 && (
            <p className="px-4 pb-4 pt-1 font-sans text-[12px] text-muted">
              Invoice sudah lunas. Komisi ini tinggal menunggu transfer dari kantor.
            </p>
          )}
        </section>
      </div>

      <section className="min-w-0 rounded-2xl bg-panel shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pb-1 pt-4">
          <div>
            <h2 className="font-sans text-[0.98rem] font-extrabold">Riwayat pembayaran</h2>
            <div className="font-sans text-[11.5px] text-muted">Transfer yang kamu terima di {periodLabel}</div>
          </div>
          {data.totalDiterimaTahun > 0 && (
            <span className="whitespace-nowrap rounded-full bg-[#d7f2e6] px-2.5 py-1 font-sans text-[11.5px] font-extrabold text-[#087a52]">
              Total {data.tahun} · {rupiah(data.totalDiterimaTahun)}
            </span>
          )}
        </div>
        {data.payouts.length > 0 ? (
          data.payouts.map((p) => (
            <PayoutBatch
              key={p.key}
              payout={p}
              open={!!open[p.key]}
              onToggle={() => setOpen((o) => ({ ...o, [p.key]: !o[p.key] }))}
            />
          ))
        ) : (
          <div className="px-4 py-6 text-center font-sans text-[0.85rem] text-muted">
            Belum ada pembayaran komisi di {periodLabel}.
          </div>
        )}
      </section>
    </div>
  );
}

function InvoiceRow({ row }: { row: MyKomisiInvoiceRow }) {
  const belum = row.status !== "paid";
  return (
    <div className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 border-t border-line py-3 first:border-t-0">
      {belum ? (
        <div
          className={`rounded-[10px] py-1.5 text-center leading-none ${
            row.hariBerjalan >= 14 ? "bg-danger/10 text-danger" : "bg-surface"
          }`}
        >
          <b className="block font-sans text-[1.05rem] font-black">{row.hariBerjalan}</b>
          <small className="font-sans text-[9.5px] font-semibold text-muted">hari</small>
        </div>
      ) : (
        <div className="rounded-[10px] bg-[#d7f2e6] py-1.5 text-center leading-none text-[#087a52]">
          <b className="block font-sans text-[0.78rem] font-black">Lunas</b>
          <small className="font-sans text-[9.5px] font-semibold">{row.tanggalLunas ? formatDateShort(row.tanggalLunas) : ""}</small>
        </div>
      )}
      <div className="min-w-0">
        <div className="font-sans text-[0.9rem] font-bold wrap-anywhere">
          {row.customerNama}
          {row.asalPeriode && (
            <span className="ml-1.5 rounded-full bg-accent-100 px-2 py-px align-[1px] font-sans text-[10px] font-extrabold text-accent-700">
              dari {asalLabel(row.asalPeriode)}
            </span>
          )}
        </div>
        <div className="font-mono text-[11px] text-muted">{row.nomor}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <FollowUpStatusBadge status={row.status} />
          {belum && <span className="font-sans text-[11px] text-muted">sisa {rupiah(row.sisaTagihan)}</span>}
        </div>
      </div>
      <div className="text-right">
        <div className="whitespace-nowrap font-sans text-[0.9rem] font-extrabold">{rupiah(row.komisi)}</div>
        <Link
          href={`/invoice/${row.invoiceId}`}
          className="mt-1.5 inline-block whitespace-nowrap rounded-full border border-line px-3 py-1 font-sans text-[0.72rem] font-bold text-ink no-underline hover:bg-surface"
        >
          Lihat invoice
        </Link>
      </div>
    </div>
  );
}

function PayoutBatch({ payout, open, onToggle }: { payout: MyKomisiPayoutRow; open: boolean; onToggle: () => void }) {
  const d = new Date(payout.tanggalBayar);
  const [, monthShort] = formatDateShort(payout.tanggalBayar).split(" ");
  return (
    <div className="border-t border-line first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="grid w-full cursor-pointer grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left hover:bg-surface"
      >
        <span className="rounded-[10px] bg-[#d7f2e6] py-1.5 text-center leading-none text-[#087a52]">
          <b className="block font-sans text-[1.05rem] font-black">{d.getDate()}</b>
          <i className="font-sans text-[10px] font-bold uppercase not-italic">{monthShort}</i>
        </span>
        <span className="min-w-0">
          <b className="block font-sans text-[0.98rem] font-black tracking-tight">{rupiah(payout.total)}</b>
          <small className="font-sans text-[11.5px] text-muted">
            {payout.invoices.length} invoice{payout.catatan ? ` · ${payout.catatan}` : ""}
          </small>
        </span>
        <svg
          className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 7.5 10 12.5 15 7.5" />
        </svg>
      </button>
      {open && (
        <div className="flex flex-col gap-1 px-4 pb-3.5 pl-[76px]">
          {payout.invoices.map((i) => (
            <div key={i.invoiceId} className="flex justify-between gap-2.5 border-b border-dashed border-line py-1.5 font-sans text-[12.5px]">
              <span className="min-w-0 wrap-anywhere">
                {i.customerNama}
                <em className="block text-[10.5px] not-italic text-muted">
                  <Link href={`/invoice/${i.invoiceId}`} className="font-mono font-bold text-accent-700 underline">
                    {i.nomor}
                  </Link>{" "}
                  · lunas {formatDateShort(i.tanggalLunas)}
                </em>
              </span>
              <b className="whitespace-nowrap">{rupiah(i.komisi)}</b>
            </div>
          ))}
          {payout.buktiUrl && (
            <a
              href={payout.buktiUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 self-start rounded-full border border-line px-3.5 py-1.5 font-sans text-[12px] font-bold text-ink no-underline hover:bg-surface"
            >
              Lihat bukti transfer
            </a>
          )}
        </div>
      )}
    </div>
  );
}
