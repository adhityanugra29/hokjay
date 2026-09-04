"use client";

import { useState } from "react";
import Link from "next/link";
import DeleteInvoiceButton from "./DeleteInvoiceButton";
import InvoiceDocument from "./InvoiceDocument";
import type { InvoicePrintData } from "./InvoicePrintDoc";
import { rupiah, toWaPhone } from "@/lib/format";

export type InvoiceRowStatus = "unpaid" | "dp" | "draft" | "paid";

export interface InvoiceRow {
  id: string;
  status: InvoiceRowStatus;
  /** Day + short month of the invoice's own date — always shown in the left block regardless of status. Per the user's request 2026-09-04 ("saya mau ini jadi tanggal dibuat saja"). */
  tglNum: string;
  tglMon: string;
  /** Only meaningful for status "unpaid" — days since the invoice was made, shown as a separate urgency badge (not the day block itself anymore). */
  hariBerjalan: number;
  custNama: string;
  custWhatsapp?: string;
  nomor: string;
  salesNama: string;
  itemCount: number;
  kurir?: string;
  grandTotal: number;
  komisi: number;
  dpPercent?: number;
  sisaTagihan?: number;
  /** Feeds the Preview drawer — same shape InvoicePrintDoc.tsx/InvoiceDocument.tsx already use. */
  printData: InvoicePrintData;
}

const STATUS_LABEL: Record<InvoiceRowStatus, string> = {
  unpaid: "Belum Dibayar",
  dp: "Sudah DP",
  draft: "Draft",
  paid: "Sudah Lunas",
};
const STATUS_TAG_CLASS: Record<InvoiceRowStatus, string> = {
  unpaid: "border-accent-700 text-accent-700",
  dp: "border-gold text-gold",
  draft: "border-line text-muted",
  paid: "border-moss-deep text-moss-deep",
};
const DAY_BORDER_CLASS: Record<InvoiceRowStatus, string> = {
  unpaid: "border-accent",
  dp: "border-gold",
  draft: "border-line",
  paid: "border-line",
};
const DAY_NUM_CLASS: Record<InvoiceRowStatus, string> = {
  unpaid: "text-accent-700",
  dp: "text-gold",
  draft: "text-muted",
  paid: "text-muted",
};

/** "perlu" (Perlu Ditindak) spans 3 statuses at once — not a single pill's worth, only reachable by clicking that one stat card, not its own pill. */
type FilterKey = "semua" | InvoiceRowStatus | "perlu";

/**
 * Invoice list — one flat list (not stacked sections) filtered through a
 * pill toggle + click-to-filter stat cards, same pattern as Keuangan's own
 * Semua/Masuk/Keluar filter. Per the user's request 2026-09-04, which
 * explicitly rejected an earlier "3 sections stacked" version: "kamu
 * jangan pisah itu berdasarkan line... ada semacam button tambahan untuk
 * melihat statusnya". Every row also gets a "Preview" button opening a
 * drawer with the real invoice document (InvoiceDocument.tsx, shared with
 * /invoice/[id]) instead of navigating away.
 */
export default function InvoiceListClient({
  rows,
  totalPiutang,
  paidThisMonthCount,
  monthLabel,
}: {
  rows: InvoiceRow[];
  totalPiutang: number;
  paidThisMonthCount: number;
  monthLabel: string;
}) {
  const [filter, setFilter] = useState<FilterKey>("semua");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const unpaidCount = rows.filter((r) => r.status === "unpaid").length;
  const dpCount = rows.filter((r) => r.status === "dp").length;
  const draftCount = rows.filter((r) => r.status === "draft").length;
  const paidCount = rows.filter((r) => r.status === "paid").length;
  const perluCount = unpaidCount + dpCount + draftCount;

  const filtered =
    filter === "semua"
      ? rows
      : filter === "perlu"
        ? rows.filter((r) => r.status !== "paid")
        : rows.filter((r) => r.status === filter);
  const previewRow = rows.find((r) => r.id === previewId) ?? null;

  return (
    <>
      {/* Stat cards — click to filter, same numbers the pill row below
          shows counts for. "Perlu ditindak" isn't its own pill (it spans 3
          statuses at once) so it's only reachable from here. */}
      <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => setFilter("perlu")}
          className={`min-w-0 rounded-xl bg-ink p-4.5 text-left text-white shadow-sm ${filter === "perlu" ? "ring-2 ring-accent" : ""}`}
        >
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">Perlu ditindak</div>
          <div className="mt-0.5 font-sans text-[1.25rem] font-extrabold">{perluCount}</div>
        </button>
        <button
          type="button"
          onClick={() => setFilter("unpaid")}
          className={`min-w-0 rounded-xl bg-panel p-4.5 text-left shadow-sm ${filter === "unpaid" ? "ring-2 ring-accent-700" : ""}`}
        >
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Belum bayar</div>
          <div className="mt-0.5 font-sans text-[1.25rem] font-extrabold">{unpaidCount}</div>
        </button>
        <button
          type="button"
          onClick={() => setFilter("dp")}
          className={`min-w-0 rounded-xl bg-panel p-4.5 text-left shadow-sm ${filter === "dp" ? "ring-2 ring-accent-700" : ""}`}
        >
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Sudah DP</div>
          <div className="mt-0.5 font-sans text-[1.25rem] font-extrabold">{dpCount}</div>
        </button>
        <button
          type="button"
          onClick={() => setFilter("paid")}
          className={`min-w-0 rounded-xl bg-panel p-4.5 text-left shadow-sm ${filter === "paid" ? "ring-2 ring-accent-700" : ""}`}
        >
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Lunas {monthLabel}</div>
          <div className="mt-0.5 font-sans text-[1.25rem] font-extrabold">{paidThisMonthCount}</div>
        </button>
      </div>

      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["semua", "Semua", rows.length],
              ["unpaid", "Belum Dibayar", unpaidCount],
              ["dp", "Sudah DP", dpCount],
              ["draft", "Draft", draftCount],
              ["paid", "Sudah Lunas", paidCount],
            ] as [FilterKey, string, number][]
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`cursor-pointer rounded-full border-[1.5px] px-3.5 py-1.5 font-mono text-[0.72rem] font-bold ${
                filter === key ? "border-accent bg-accent text-ink" : "border-line text-ink hover:border-accent-600"
              }`}
            >
              {label} <span className="opacity-60">({count})</span>
            </button>
          ))}
        </div>
        <span className="font-mono text-[0.74rem] text-muted">
          {filtered.length} invoice
          {(filter === "unpaid" || filter === "perlu") && totalPiutang > 0 && ` · ${rupiah(totalPiutang)} tertahan`}
        </span>
      </div>

      <div className="mt-3.5">
        {filtered.map((r) => (
          <div key={r.id} className="grid grid-cols-[56px_1fr_auto] items-center gap-4 border-b border-line py-3.5">
            <div className={`border-l-4 pl-2.5 ${DAY_BORDER_CLASS[r.status]}`}>
              <div className={`font-sans text-[0.95rem] font-extrabold leading-none ${DAY_NUM_CLASS[r.status]}`}>
                {r.tglNum}
              </div>
              <div className="font-mono text-[9px] text-muted">{r.tglMon}</div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-sans text-[1rem] font-bold">{r.custNama}</span>
                <span className={`rounded-full border px-2 py-0.5 font-mono text-[0.62rem] font-bold ${STATUS_TAG_CLASS[r.status]}`}>
                  {STATUS_LABEL[r.status]}
                  {r.status === "dp" && r.dpPercent != null ? ` ${r.dpPercent}%` : ""}
                </span>
                {r.status === "unpaid" && (
                  <span className="rounded-full bg-danger/10 px-2 py-0.5 font-mono text-[0.62rem] font-bold text-danger">
                    {r.hariBerjalan} hari
                  </span>
                )}
              </div>
              <div className="mt-0.5 font-mono text-[0.72rem] text-muted">
                {r.nomor} · sales {r.salesNama} · {r.itemCount} item{r.kurir ? ` · kirim via ${r.kurir}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="font-sans text-[1rem] font-extrabold">{rupiah(r.grandTotal)}</div>
                <div className="font-mono text-[0.68rem] text-muted">
                  {r.status === "dp" && r.sisaTagihan != null
                    ? `sisa ${rupiah(r.sisaTagihan)}`
                    : r.status === "draft"
                      ? "estimasi"
                      : r.status !== "paid"
                        ? `komisi ${rupiah(r.komisi)}`
                        : ""}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewId(r.id)}
                  className="cursor-pointer border border-accent-600 bg-accent-100 px-3 py-1.5 font-sans text-[0.72rem] font-bold text-accent-700 hover:bg-accent-100/70"
                >
                  Preview
                </button>
                {(r.status === "unpaid" || r.status === "dp") && (
                  <>
                    <a
                      href={`https://wa.me/${toWaPhone(r.custWhatsapp)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="border border-line px-3 py-1.5 font-sans text-[0.72rem] font-semibold text-ink no-underline hover:border-accent hover:text-accent-700"
                    >
                      Kirim WA
                    </a>
                    <Link
                      href={`/invoice/${r.id}/ubah`}
                      className="border border-line px-3 py-1.5 font-sans text-[0.72rem] font-semibold text-ink no-underline hover:border-accent hover:text-accent-700"
                    >
                      Edit
                    </Link>
                    {r.sisaTagihan == null && <DeleteInvoiceButton invoiceId={r.id} nomor={r.nomor} />}
                    <Link
                      href={`/invoice/${r.id}`}
                      className="border border-accent bg-accent px-3 py-1.5 font-sans text-[0.72rem] font-bold text-ink no-underline hover:bg-accent-600"
                    >
                      Tandai lunas
                    </Link>
                  </>
                )}
                {r.status === "draft" && (
                  <>
                    <DeleteInvoiceButton invoiceId={r.id} nomor={r.nomor} />
                    <Link
                      href={`/invoice/${r.id}/ubah`}
                      className="border border-accent bg-accent px-3 py-1.5 font-sans text-[0.72rem] font-bold text-ink no-underline hover:bg-accent-600"
                    >
                      Lanjutkan
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="border-b border-line py-8 text-center font-mono text-[0.8rem] text-muted">
            Tidak ada invoice untuk filter ini.
          </div>
        )}
      </div>

      {previewRow && (
        <div className="no-print fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setPreviewId(null)}>
          <div
            className="flex h-full w-full max-w-3xl flex-col overflow-y-auto bg-panel shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line bg-surface px-5 py-4">
              <div>
                <div className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-muted">Preview Invoice</div>
                <h2 className="font-sans text-[1rem] font-extrabold text-ink">{previewRow.custNama}</h2>
              </div>
              <button
                type="button"
                onClick={() => setPreviewId(null)}
                aria-label="Tutup"
                className="flex h-9 w-9 cursor-pointer items-center justify-center border border-line text-lg text-ink hover:border-accent hover:text-accent-700"
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              <InvoiceDocument invoice={previewRow.printData} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
