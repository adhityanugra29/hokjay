"use client";

import { useState } from "react";
import Link from "next/link";
import DeleteInvoiceButton from "./DeleteInvoiceButton";
import TandaiKirimButton, { type CourierOption } from "./TandaiKirimButton";
import InvoiceDocument from "./InvoiceDocument";
import InvoicePrintDoc from "./InvoicePrintDoc";
import { Button } from "@/components/ui/Button";
import { useInvoicePdfDownload } from "./useInvoicePdfDownload";
import { useDialog } from "@/components/ui/Dialog";
import ZoomableImage from "@/components/katalog/ZoomableImage";
import type { InvoicePrintData } from "./InvoicePrintDoc";
import { rupiah, toWaPhone, formatDateShort } from "@/lib/format";

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
  /** Real "sudah dikirim" flag, independent of payment status — see /api/invoices/[id]/kirim. */
  dikirim: boolean;
  tanggalDikirimAktual?: string;
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

const STEP_SOLID_CLS =
  "block w-full rounded-lg border border-accent bg-accent px-3 py-1.5 text-center font-sans text-[0.72rem] font-bold text-ink no-underline hover:bg-accent-600";
const STEP_DARK_CLS =
  "block w-full cursor-pointer rounded-lg border border-ink bg-ink px-3 py-1.5 text-center font-sans text-[0.72rem] font-bold text-accent hover:bg-ink/85";
const ICON_BTN_CLS =
  "group relative flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-lg border border-line text-ink no-underline hover:bg-black/5";

/** Icon-only button/link with a hover/focus label (and an aria-label for screen readers). */
function IconButton({
  label,
  onClick,
  href,
  className = "",
  children,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const tip = (
    <span className="pointer-events-none absolute top-[calc(100%+6px)] right-0 z-30 whitespace-nowrap rounded-md bg-ink px-2 py-1 font-sans text-[11px] font-bold text-accent opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
      {label}
    </span>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" aria-label={label} className={`${ICON_BTN_CLS} ${className}`}>
        {children}
        {tip}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} className={`${ICON_BTN_CLS} ${className}`}>
      {children}
      {tip}
    </button>
  );
}

function GroupTitle({ label, count, highlight }: { label: string; count: number; highlight?: boolean }) {
  return (
    <div className="mt-2 flex items-center gap-2 border-b border-line pt-3 pb-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
      <span className="text-ink">{label}</span>
      <span className={`rounded-full px-2 py-px tracking-normal text-ink ${highlight ? "bg-accent" : "bg-surface"}`}>{count}</span>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{label}</div>
      <div className="mt-0.5 truncate font-sans text-[0.8rem] font-bold">{value}</div>
    </div>
  );
}

type FilterKey = "semua" | InvoiceRowStatus;

/**
 * Invoice list — one flat list (not stacked sections) filtered through a
 * pill toggle, same pattern as Keuangan's own Semua/Masuk/Keluar filter.
 * Per the user's request 2026-09-04, which explicitly rejected an earlier
 * "3 sections stacked" version: "kamu jangan pisah itu berdasarkan line...
 * ada semacam button tambahan untuk melihat statusnya". Every row also
 * gets a "Preview" button opening a drawer with the real invoice document
 * (InvoiceDocument.tsx, shared with /invoice/[id]) instead of navigating
 * away.
 *
 * The 2 summary cards above the pill row are pure display, driven by
 * whichever pill is active — not their own click targets, and not
 * independent fixed-bucket counts — per the user's request 2026-09-07
 * (this replaced 4 independently-clickable cards, one of which,
 * "Perlu ditindak", had no pill of its own and is gone with no
 * replacement).
 *
 * 2026-10-02: rows rebuilt on fixed columns with a chevron detail, the 2
 * cards became a one-line summary, and "Perlu tindakan"/"Selesai" grouping
 * was added under "Semua" — all per the approved mockup
 * docs/SDD/mockups/invoice-list-v1.html.
 */
export default function InvoiceListClient({ rows, couriers }: { rows: InvoiceRow[]; couriers: CourierOption[] }) {
  const [filter, setFilter] = useState<FilterKey>("semua");
  const [previewId, setPreviewId] = useState<string | null>(null);
  // Which row's detail (sales / item / kurir / Ubah / Hapus) is open — one at a time.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Preview drawer's "Invoice"/"Surat Jalan"/"Bukti Transfer" tabs —
  // TASK-016 (2026-09-07) added Invoice/Bukti Transfer; "Surat Jalan"
  // added 2026-09-08 per the user's request, so a Surat Jalan can be
  // previewed and downloaded straight from the list without opening
  // /invoice/[id]. Always starts on "invoice" (reset alongside
  // setPreviewId, not via a separate effect) so opening a different
  // row's preview never lands on the previous row's tab.
  const [previewTab, setPreviewTab] = useState<"invoice" | "surat-jalan" | "bukti">("invoice");
  // Surat Jalan's driver name for the CURRENTLY open preview only — never
  // sent to the server, never persisted (see useInvoicePdfDownload.ts's own
  // comment on why it's never stored). null = not captured yet for this
  // preview. Reset to null alongside previewId/previewTab so a different
  // invoice (or reopening the same one later) always starts fresh — per
  // the user's request 2026-09-08, captured once when the tab opens so the
  // on-screen preview can show it too, not just the downloaded PDF.
  const [driverName, setDriverName] = useState<string | null>(null);
  // Shared with InvoiceActions.tsx (the /invoice/[id] detail page) — see
  // useInvoicePdfDownload.ts for why the html2canvas/jsPDF logic lives
  // there instead of being duplicated here.
  const { downloading, downloadingSuratJalan, downloadInvoicePdf, downloadSuratJalanPdf } = useInvoicePdfDownload();
  const { prompt } = useDialog();

  /** Always re-asks, even if a name is already set — used by the "Ubah" link. */
  async function promptDriverName(): Promise<string | null> {
    const typed = await prompt("Nama driver yang mengantar barang ini:", {
      title: "Nama Driver",
      placeholder: "Contoh: Pak Joko",
      confirmLabel: "Simpan",
    });
    if (typed === null) return null; // cancelled
    const value = typed.trim() || "—";
    setDriverName(value);
    return value;
  }

  /** Only asks the first time — reuses whatever's already captured for this preview otherwise. */
  async function ensureDriverName(): Promise<string | null> {
    if (driverName !== null) return driverName;
    return promptDriverName();
  }

  /** Opens the Preview drawer on a specific invoice, always starting on the "Invoice" tab with no driver name carried over from whatever was previewed before. */
  function openPreview(id: string) {
    setPreviewId(id);
    setPreviewTab("invoice");
    setDriverName(null);
  }

  /** Switching TO "Surat Jalan" the first time for this preview immediately asks for the driver name, per the user's request 2026-09-08 — so the preview never sits there showing a placeholder the person has to guess is editable. */
  async function handleTabClick(key: "invoice" | "surat-jalan" | "bukti") {
    setPreviewTab(key);
    if (key === "surat-jalan" && driverName === null) {
      await ensureDriverName();
    }
  }

  const unpaidCount = rows.filter((r) => r.status === "unpaid").length;
  const dpCount = rows.filter((r) => r.status === "dp").length;
  const draftCount = rows.filter((r) => r.status === "draft").length;
  const paidCount = rows.filter((r) => r.status === "paid").length;

  const filtered = filter === "semua" ? rows : rows.filter((r) => r.status === filter);
  const previewRow = rows.find((r) => r.id === previewId) ?? null;

  // "Total Nilai Invoice" — meaning shifts with the active pill so it never
  // mixes piutang (still owed) with uang yang sudah lunas into one
  // misleading number. Per the user's request 2026-09-07 ("Kamu Break jika
  // dia pilih semua : Berapa piutangnya? berapa yang sudah lunas?"), then
  // confirmed: "Sudah DP" sums the remaining sisa tagihan (what's still
  // owed on those invoices); every other filter — including "Semua", which
  // mixes lunas and belum lunas together — sums the full grandTotal.
  const totalNilaiInvoice =
    filter === "dp"
      ? filtered.reduce((s, r) => s + (r.sisaTagihan ?? r.grandTotal), 0)
      : filtered.reduce((s, r) => s + r.grandTotal, 0);

  // Needs action = not paid yet, or paid but not shipped yet. Grouping applies only under "Semua".
  const needsAction = filtered.filter((r) => r.status !== "paid" || !r.dikirim);
  const done = filtered.filter((r) => r.status === "paid" && r.dikirim);
  const grouped = filter === "semua";

  /**
   * One list row — fixed columns (tanggal | pelanggan | status | total | aksi)
   * so every row lines up whatever its state, per the approved mockup
   * 2026-10-02 (docs/SDD/mockups/invoice-list-v1.html). The visible actions
   * are the one next-step button (Tandai Lunas / Tandai Sudah Kirim /
   * Lanjutkan), Preview and WA as icons, and a chevron opening the detail
   * (sales, item, kurir, Tandai Sudah Kirim, Ubah, Hapus). This replaces the
   * old "⋯" overflow menu; every action it held is still reachable.
   */
  function renderRow(r: InvoiceRow) {
    const isOpen = expandedId === r.id;
    const isDraft = r.status === "draft";
    const isPaid = r.status === "paid";
    const canEdit = r.status === "unpaid" || r.status === "dp";
    // Delete rules unchanged: draft, or unpaid without a DP (never once DP'd).
    const canDelete = isDraft || (r.status === "unpaid" && r.sisaTagihan == null);

    let step: React.ReactNode = null;
    if (isDraft) {
      step = (
        <Link href={`/invoice/${r.id}/ubah`} className={STEP_SOLID_CLS}>
          Lanjutkan
        </Link>
      );
    } else if (!isPaid) {
      step = (
        <Link href={`/invoice/${r.id}`} className={STEP_SOLID_CLS}>
          Tandai Lunas
        </Link>
      );
    } else if (!r.dikirim) {
      step = (
        <TandaiKirimButton
          invoiceId={r.id}
          nomor={r.nomor}
          customerNama={r.custNama}
          couriers={couriers}
          currentKurir={r.kurir}
          className={STEP_DARK_CLS}
        />
      );
    }

    return (
      <div key={r.id} className={`border-b border-line ${isOpen ? "bg-panel" : ""}`}>
        <div className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 py-3 md:grid-cols-[56px_minmax(0,1.5fr)_170px_150px_280px] md:gap-x-4">
          <div className={`border-l-4 pl-2.5 ${DAY_BORDER_CLASS[r.status]}`}>
            <div className={`font-sans text-[0.95rem] font-extrabold leading-none ${DAY_NUM_CLASS[r.status]}`}>
              {r.tglNum}
            </div>
            <div className="font-mono text-[9px] text-muted">{r.tglMon}</div>
          </div>

          <div className="min-w-0">
            <div className="truncate font-sans text-[1rem] font-bold">{r.custNama}</div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.72rem] text-muted">
              <span>{r.nomor}</span>
              {r.status === "unpaid" && (
                <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[0.62rem] font-bold text-danger">
                  {r.hariBerjalan} hari belum bayar
                </span>
              )}
            </div>
          </div>

          {/* Mobile: total sits top-right; desktop: its own column further right. */}
          <div className="text-right md:order-4">
            <div className="font-sans text-[1rem] font-extrabold tabular-nums">{rupiah(r.grandTotal)}</div>
            <div className="font-mono text-[0.68rem] text-muted">
              {r.status === "dp" && r.sisaTagihan != null
                ? `sisa ${rupiah(r.sisaTagihan)}`
                : isDraft
                  ? "estimasi"
                  : !isPaid
                    ? `komisi ${rupiah(r.komisi)}`
                    : ""}
            </div>
          </div>

          {/* Pembayaran + pengiriman as two stacked pills. */}
          <div className="col-start-2 flex flex-wrap gap-1.5 md:order-3 md:col-start-auto md:flex-col md:items-start md:gap-1">
            <span className={`rounded-full border px-2 py-0.5 font-mono text-[0.62rem] font-bold ${STATUS_TAG_CLASS[r.status]}`}>
              {STATUS_LABEL[r.status]}
              {r.status === "dp" && r.dpPercent != null ? ` ${r.dpPercent}%` : ""}
            </span>
            {!isDraft &&
              (r.dikirim ? (
                <span className="rounded-full border border-emerald-500 bg-emerald-50 px-2 py-0.5 font-mono text-[0.62rem] font-bold text-emerald-700">
                  ✓ Dikirim{r.tanggalDikirimAktual ? ` · ${formatDateShort(r.tanggalDikirimAktual)}` : ""}
                </span>
              ) : (
                <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[0.62rem] font-bold text-muted">
                  Belum dikirim
                </span>
              ))}
          </div>

          <div className="col-span-3 flex items-center justify-end gap-1.5 md:order-5 md:col-span-1">
            {/* Fixed-width slot (empty when there is no next step) so Preview/WA/chevron
                sit at the same x on every row, whichever step the row has. */}
            <div className="min-w-0 flex-1 md:w-[150px] md:flex-none">{step}</div>
            <IconButton label="Preview" onClick={() => openPreview(r.id)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-[17px] w-[17px]">
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </IconButton>
            {isDraft ? (
              <span className="h-[34px] w-[34px] shrink-0" aria-hidden="true" />
            ) : (
              <IconButton
                label="Kirim ke Pelanggan (WA)"
                href={`https://wa.me/${toWaPhone(r.custWhatsapp)}`}
                className="border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-[17px] w-[17px]">
                  <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.7-5.2A8.5 8.5 0 1 1 21 11.5Z" />
                  <path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .8c-.9-.4-1.7-1.2-2.1-2.1l.8-1-1-2-1.2.4Z" />
                </svg>
              </IconButton>
            )}
            <button
              type="button"
              onClick={() => setExpandedId(isOpen ? null : r.id)}
              aria-expanded={isOpen}
              aria-label={isOpen ? "Tutup detail" : "Buka detail"}
              className={`flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-lg border text-[11px] ${
                isOpen ? "border-ink bg-ink text-accent" : "border-line text-muted hover:bg-black/5"
              }`}
            >
              {isOpen ? "▴" : "▾"}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="grid grid-cols-2 items-end gap-x-6 gap-y-3 px-1 pb-4 md:grid-cols-[repeat(4,minmax(0,1fr))_auto] md:pl-[72px]">
            <DetailItem label="Sales" value={r.salesNama} />
            <DetailItem label="Item" value={`${r.itemCount} item`} />
            <DetailItem label="Pengiriman" value={r.kurir ?? "—"} />
            <DetailItem label="Dibuat" value={formatDateShort(r.printData.tanggal)} />
            <div className="col-span-2 flex flex-wrap justify-end gap-2 md:col-span-1">
              {/* Second lifecycle step, kept reachable here when the next-step
                  button above is "Tandai Lunas". */}
              {!isDraft && !isPaid && !r.dikirim && (
                <TandaiKirimButton
                  invoiceId={r.id}
                  nomor={r.nomor}
                  customerNama={r.custNama}
                  couriers={couriers}
                  currentKurir={r.kurir}
                />
              )}
              {canEdit && (
                <Link
                  href={`/invoice/${r.id}/ubah`}
                  className="rounded-lg border border-line px-3 py-1.5 font-sans text-[0.72rem] font-bold text-ink no-underline hover:bg-black/5"
                >
                  Ubah
                </Link>
              )}
              {canDelete && <DeleteInvoiceButton invoiceId={r.id} nomor={r.nomor} />}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* One-line summary replacing the 2 big cards — per the user's approved
          mockup 2026-10-02 (docs/SDD/mockups/invoice-list-v1.html). Still pure
          display and still tracks whichever status pill is active, exactly
          as the cards did (TASK-020). */}
      <div className="mb-4 flex flex-wrap items-baseline gap-x-5 gap-y-1 tabular-nums">
        <span className="font-sans text-[0.8rem] text-muted">
          <b className="mr-1 text-[1.2rem] font-extrabold tracking-tight text-ink">{filtered.length}</b>invoice
        </span>
        <span className="font-sans text-[0.8rem] text-muted">
          <b className="mr-1 text-[1.2rem] font-extrabold tracking-tight text-ink">{rupiah(totalNilaiInvoice)}</b>
          total nilai
        </span>
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
      </div>

      {/* "Perlu tindakan" on top, "Selesai" below — only under the "Semua"
          pill (a status pill already narrows the list to one kind). Per the
          approved mockup 2026-10-02. */}
      <div className="mt-3.5">
        {grouped ? (
          <>
            {needsAction.length > 0 && <GroupTitle label="Perlu tindakan" count={needsAction.length} highlight />}
            {needsAction.map(renderRow)}
            {done.length > 0 && <GroupTitle label="Selesai" count={done.length} />}
            {done.map(renderRow)}
          </>
        ) : (
          filtered.map(renderRow)
        )}
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
            {/* "Invoice"/"Surat Jalan" always available; "Bukti Transfer"
                only joins when there's actually something to switch to — a
                cash-paid invoice has neither buktiUrl (PaymentForm.tsx
                clears it for "tunai/cash"). Same pill styling the status
                filter row above already uses, for visual consistency. */}
            <div className="flex flex-wrap gap-1.5 border-b border-line bg-panel px-5 py-3">
              {(
                [
                  ["invoice", "Invoice"],
                  ["surat-jalan", "Surat Jalan"],
                  ...(previewRow.printData.dpBuktiUrl || previewRow.printData.paymentBuktiUrl
                    ? ([["bukti", "Bukti Transfer"]] as const)
                    : []),
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleTabClick(key)}
                  className={`cursor-pointer rounded-full border-[1.5px] px-3.5 py-1.5 font-mono text-[0.72rem] font-bold ${
                    previewTab === key ? "border-accent bg-accent text-ink" : "border-line text-ink hover:border-accent-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="p-5">
              {previewTab === "bukti" && <BuktiTransferView invoice={previewRow.printData} />}
              {previewTab === "invoice" && (
                <>
                  <div className="mb-4 flex justify-end">
                    <Button
                      variant="ghost"
                      onClick={() => downloadInvoicePdf(previewRow.nomor, "list-invoice-print-doc")}
                      disabled={downloading}
                    >
                      {downloading ? "Menyiapkan PDF..." : "Unduh Invoice (PDF)"}
                    </Button>
                  </div>
                  <InvoiceDocument invoice={previewRow.printData} />
                </>
              )}
              {previewTab === "surat-jalan" && (
                <>
                  {/* Driver name is asked as soon as this tab opens
                      (handleTabClick above) — this row just shows what
                      was captured plus a way to correct it before
                      downloading. Per the user's request 2026-09-08: once
                      set, it must actually show in the preview document
                      below, not just silently feed the PDF. */}
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="font-mono text-[0.72rem] text-muted">
                      Nama Driver:{" "}
                      <span className="font-bold text-ink">{driverName ?? "belum diisi"}</span>{" "}
                      <button
                        type="button"
                        onClick={() => promptDriverName()}
                        className="cursor-pointer text-accent-700 underline underline-offset-2 hover:text-accent-800"
                      >
                        {driverName ? "Ubah" : "Isi sekarang"}
                      </button>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        const name = await ensureDriverName();
                        if (name === null) return;
                        downloadSuratJalanPdf(previewRow.nomor, "list-surat-jalan-print-doc", name);
                      }}
                      disabled={downloadingSuratJalan}
                    >
                      {downloadingSuratJalan ? "Menyiapkan PDF..." : "Unduh Surat Jalan (PDF)"}
                    </Button>
                  </div>
                  <InvoiceDocument
                    invoice={{ ...previewRow.printData, namaDriver: driverName ?? undefined }}
                    mode="surat-jalan"
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Hidden, off-screen paginated layouts the download buttons above
          actually capture (html2canvas + jsPDF) — same approach as
          app/invoice/[id]/page.tsx's own two instances. Deliberately a
          SEPARATE block from the drawer overlay above, not nested inside
          it — BUG-019: nesting these as extra children of that overlay's
          own `flex justify-end` row made them count as flex items too,
          and even though each renders at `h-0`, its un-clipped content
          width (a 794px-wide invoice page) still occupies horizontal
          space along the row — so `justify-end` packed the whole row
          flush right INCLUDING these two invisible spacers, shoving the
          actually-visible drawer panel over to the left. Rendering them
          here, outside that flex container entirely, keeps them exactly
          as invisible/off-screen as intended without them ever being able
          to influence the overlay's own layout again. Keyed on the row id
          so switching preview rows always starts each instance's adaptive
          page-packing fresh instead of carrying over a previous invoice's
          measured header/footer heights. Mounted only while a row is
          being previewed. */}
      {previewRow && (
        <>
          <InvoicePrintDoc key={`inv-${previewRow.id}`} invoice={previewRow.printData} id="list-invoice-print-doc" />
          <InvoicePrintDoc
            key={`sj-${previewRow.id}`}
            invoice={previewRow.printData}
            mode="surat-jalan"
            id="list-surat-jalan-print-doc"
          />
        </>
      )}
    </>
  );
}

/** True for a URL that's a PDF (case-insensitive extension check) — UploadBox accepts both images and PDFs for Bukti Transfer, so this can't assume every buktiUrl is safely <img>-able. */
function isPdfUrl(url: string): boolean {
  return /\.pdf($|\?)/i.test(url);
}

/**
 * One bukti card — an image opens the same in-app full-screen zoom Katalog
 * product photos already use (ZoomableImage.tsx, with its own working ✕/
 * Escape/backdrop close), not a new browser tab. A PDF still opens in a
 * new tab (no in-app PDF viewer exists in this app to reuse, and that's
 * standard, expected browser behavior for a PDF either way).
 *
 * Originally used a plain `target="_blank"` link ("Buka ukuran penuh") for
 * both cases — per the user's report 2026-09-07 ("ketika sudah klik
 * penuh, tidak ada tombol untuk kembali"), a new tab can leave a mobile
 * user stranded with no obvious way back to the drawer. Reusing
 * ZoomableImage fixes this for the image case (the vast majority of real
 * bukti uploads) without inventing a second full-screen pattern.
 */
function BuktiCard({ eyebrow, url }: { eyebrow: string; url: string }) {
  return (
    <div className="rounded-xl bg-panel p-5 shadow-sm">
      <h3 className="mb-3 font-mono text-[0.7rem] uppercase tracking-wide text-muted">{eyebrow}</h3>
      {isPdfUrl(url) ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex h-[220px] w-full items-center justify-center rounded-lg border border-line bg-surface font-sans text-[0.82rem] font-semibold text-accent-700 underline underline-offset-2"
        >
          Buka file PDF ↗
        </a>
      ) : (
        <div className="relative h-[220px] w-full overflow-hidden rounded-lg border border-line bg-surface">
          {/* !object-contain: ZoomableImage's own base class already sets
              object-cover (right for a cropped product-photo thumbnail,
              wrong here — a bukti transfer needs to show the WHOLE
              receipt, not crop it) — same-specificity utilities aren't
              guaranteed to lose to whichever is listed later in the
              className string, so this needs the ! to reliably win. */}
          <ZoomableImage src={url} alt={eyebrow} className="!object-contain p-3" />
        </div>
      )}
    </div>
  );
}

/** The Preview drawer's "Bukti Transfer" tab body — up to two cards (DP and/or full settlement), whichever the invoice actually has. */
function BuktiTransferView({ invoice }: { invoice: InvoicePrintData }) {
  return (
    <div className="flex flex-col gap-4">
      {invoice.dpBuktiUrl && (
        <BuktiCard
          eyebrow={`Bukti DP · ${formatDateShort(invoice.dpTanggal ?? invoice.tanggal)}${
            invoice.dpNominal ? ` · ${rupiah(invoice.dpNominal)}` : ""
          }`}
          url={invoice.dpBuktiUrl}
        />
      )}
      {invoice.paymentBuktiUrl && (
        <BuktiCard
          eyebrow={`Bukti Pelunasan · ${formatDateShort(invoice.paymentTanggalBayar ?? invoice.tanggal)}${
            invoice.paymentNominalDiterima ? ` · ${rupiah(invoice.paymentNominalDiterima)}` : ""
          }`}
          url={invoice.paymentBuktiUrl}
        />
      )}
    </div>
  );
}
