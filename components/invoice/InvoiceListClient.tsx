"use client";

import { useState } from "react";
import Link from "next/link";
import DeleteInvoiceButton from "./DeleteInvoiceButton";
import InvoiceDocument from "./InvoiceDocument";
import InvoicePrintDoc from "./InvoicePrintDoc";
import { Button } from "@/components/ui/Button";
import { useInvoicePdfDownload } from "./useInvoicePdfDownload";
import { useDialog } from "@/components/ui/Dialog";
import ZoomableImage from "@/components/katalog/ZoomableImage";
import { useInvoicePrintData } from "./useInvoicePrintData";
import LinkPending from "@/components/ui/LinkPending";
import type { InvoicePrintData } from "@/lib/invoiceDisplay";
import { rupiah, toWaPhone, formatDateShort } from "@/lib/format";

export type InvoiceRowStatus = "unpaid" | "dp" | "draft" | "paid";

export interface InvoiceRow {
  id: string;
  status: InvoiceRowStatus;
  /** Day + short month of the invoice's own date — always shown in the left block regardless of status. */
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
  /** Invoice date (ISO) — the full InvoicePrintData for the Preview drawer is loaded on open (useInvoicePrintData). */
  tanggal: string;
  /** Has a DP and/or pelunasan proof of transfer — decides whether the Preview drawer offers the "Bukti Transfer" tab. */
  hasBukti: boolean;
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

function Chevron({ up }: { up?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`h-4 w-4 ${up ? "rotate-180" : ""}`}>
      <path d="m6 9 6 6 6-6" />
    </svg>
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

export type InvoiceFilterKey = "semua" | InvoiceRowStatus;

/** Invoice counts for the current search/sales/periode filters, computed server-side (the page itself only carries one page of rows). */
export interface InvoiceListCounts {
  semua: number;
  unpaid: number;
  dp: number;
  draft: number;
  paid: number;
  /** Under "Semua": invoices still needing action (not paid, or paid but not shipped) vs. finished ones. */
  needs: number;
  done: number;
}

/**
 * Invoice list: one flat list filtered through status pills (links: the status lives in the URL, the server pages through it, not stacked sections). Every row has a "Preview" button opening a drawer with the real invoice
 * document (InvoiceDocument.tsx, shared with /invoice/[id]). The one-line summary is display only and tracks the active pill. Rows use fixed columns with a
 * chevron detail and, under "Semua", are grouped "Perlu tindakan"/"Selesai" (docs/SDD/mockups/invoice-list-v1.html).
 */
export default function InvoiceListClient({
  rows,
  status,
  counts,
  totalNilai,
  pillHrefs,
}: {
  /** The current page of invoices (already filtered by `status` and ordered by the server). */
  rows: InvoiceRow[];
  status: InvoiceFilterKey;
  counts: InvoiceListCounts;
  /** Sum shown in the summary strip: remaining sisa tagihan for "Sudah DP", grandTotal otherwise. */
  totalNilai: number;
  pillHrefs: Record<InvoiceFilterKey, string>;
}) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  // Which row's detail (sales / item / kurir / Ubah / Hapus) is open — one at a time.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Preview drawer tab. Always starts on "invoice" (reset in openPreview, not via an effect) so a different row never lands on the previous row's tab.
  const [previewTab, setPreviewTab] = useState<"invoice" | "surat-jalan" | "bukti">("invoice");
  // Surat Jalan's driver name for the CURRENTLY open preview only: never sent to the server or persisted (see useInvoicePdfDownload.ts). null = not captured
  // yet; reset with previewId/previewTab. Captured once when the tab opens so the on-screen preview shows it too, not just the PDF.
  const [driverName, setDriverName] = useState<string | null>(null);
  // Shared with InvoiceActions.tsx (the detail page); the html2canvas/jsPDF logic lives in useInvoicePdfDownload.ts.
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

  /** Opens the Preview drawer on a row, starting on the "Invoice" tab with no driver name carried over. */
  function openPreview(id: string) {
    setPreviewId(id);
    setPreviewTab("invoice");
    setDriverName(null);
  }

  /** Switching TO "Surat Jalan" the first time asks for the driver name immediately, so the preview never shows a placeholder the person has to guess is editable. */
  async function handleTabClick(key: "invoice" | "surat-jalan" | "bukti") {
    setPreviewTab(key);
    if (key === "surat-jalan" && driverName === null) {
      await ensureDriverName();
    }
  }

  const previewRow = rows.find((r) => r.id === previewId) ?? null;
  const printResult = useInvoicePrintData(previewId);
  const printData = printResult?.data;

  // Needs action = not paid yet, or paid but not shipped yet. Grouping applies only under "Semua".
  const needsAction = rows.filter((r) => r.status !== "paid" || !r.dikirim);
  const done = rows.filter((r) => r.status === "paid" && r.dikirim);
  const grouped = status === "semua";

  /**
   * One list row on fixed columns (tanggal | pelanggan | status | total | aksi) so every row lines up. Visible actions: the one next-step button, Preview and WA
   * icons, and a chevron opening the detail (sales, item, kurir, Tandai Sudah Kirim, Ubah, Hapus).
   */
  function renderRow(r: InvoiceRow) {
    const isOpen = expandedId === r.id;
    const isDraft = r.status === "draft";
    const isPaid = r.status === "paid";
    const canEdit = r.status === "unpaid" || r.status === "dp";
    // Delete: draft, or unpaid without a DP (never once DP'd).
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
              <Chevron up={isOpen} />
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="grid grid-cols-2 items-end gap-x-6 gap-y-3 px-1 pb-4 md:grid-cols-[repeat(4,minmax(0,1fr))_auto] md:pl-[72px]">
            <DetailItem label="Sales" value={r.salesNama} />
            <DetailItem label="Item" value={`${r.itemCount} item`} />
            <DetailItem label="Pengiriman" value={r.kurir ?? "—"} />
            <DetailItem label="Dibuat" value={formatDateShort(r.tanggal)} />
            <div className="col-span-2 flex flex-wrap justify-end gap-2 md:col-span-1">
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
      {/* One-line summary; display only, tracks whichever status pill is active. */}
      <div className="mb-4 flex flex-wrap items-baseline gap-x-5 gap-y-1 tabular-nums">
        <span className="font-sans text-[0.8rem] text-muted">
          <b className="mr-1 text-[1.2rem] font-extrabold tracking-tight text-ink">{counts[status]}</b>invoice
        </span>
        <span className="font-sans text-[0.8rem] text-muted">
          <b className="mr-1 text-[1.2rem] font-extrabold tracking-tight text-ink">{rupiah(totalNilai)}</b>
          total nilai
        </span>
      </div>

      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["semua", "Semua", counts.semua],
              ["unpaid", "Belum Dibayar", counts.unpaid],
              ["dp", "Sudah DP", counts.dp],
              ["draft", "Draft", counts.draft],
              ["paid", "Sudah Lunas", counts.paid],
            ] as [InvoiceFilterKey, string, number][]
          ).map(([key, label, count]) => (
            <Link
              key={key}
              href={pillHrefs[key]}
              aria-current={status === key ? "true" : undefined}
              className={`relative cursor-pointer rounded-full border-[1.5px] px-3.5 py-1.5 font-mono text-[0.72rem] font-bold no-underline ${
                status === key ? "border-accent bg-accent text-ink" : "border-line text-ink hover:border-accent-600"
              }`}
            >
              {label} <span className="opacity-60">({count})</span>
              <LinkPending className="-right-1 -top-1" />
            </Link>
          ))}
        </div>
      </div>

      {/* "Perlu tindakan" on top, "Selesai" below, only under the "Semua" pill (a status pill already narrows the list to one kind). */}
      <div className="mt-3.5">
        {grouped ? (
          <>
            {needsAction.length > 0 && <GroupTitle label="Perlu tindakan" count={counts.needs} highlight />}
            {needsAction.map(renderRow)}
            {done.length > 0 && <GroupTitle label="Selesai" count={counts.done} />}
            {done.map(renderRow)}
          </>
        ) : (
          rows.map(renderRow)
        )}
        {rows.length === 0 && (
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
            {/* "Invoice"/"Surat Jalan" always; "Bukti Transfer" only when there is something to show (a cash-paid invoice has no buktiUrl: PaymentForm clears it for tunai/cash). */}
            <div className="flex flex-wrap gap-1.5 border-b border-line bg-panel px-5 py-3">
              {(
                [
                  ["invoice", "Invoice"],
                  ["surat-jalan", "Surat Jalan"],
                  ...(previewRow.hasBukti
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
              {!printData && (
                <div className="py-10 text-center font-mono text-[0.8rem] text-muted">
                  {printResult?.error ?? "Memuat invoice..."}
                </div>
              )}
              {printData && previewTab === "bukti" && <BuktiTransferView invoice={printData} />}
              {printData && previewTab === "invoice" && (
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
                  <InvoiceDocument invoice={printData} />
                </>
              )}
              {printData && previewTab === "surat-jalan" && (
                <>
                  {/* Driver name is asked when this tab opens (handleTabClick); this row shows it plus a way to correct it, and it shows in the preview document below, not just the PDF. */}
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
                    invoice={{ ...printData, namaDriver: driverName ?? undefined }}
                    mode="surat-jalan"
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Hidden, off-screen paginated layouts the download buttons capture (html2canvas + jsPDF), same as app/invoice/[id]/page.tsx. Deliberately a SEPARATE block from the
          drawer overlay (BUG-019): as children of its `flex justify-end` row they counted as flex items, and their un-clipped 794px width shoved the visible panel to the left.
          Keyed on the row id so each instance's page-packing starts fresh instead of reusing a previous invoice's measured heights. Mounted only while a row is previewed. */}
      {previewRow && printData && (
        <>
          <InvoicePrintDoc key={`inv-${previewRow.id}`} invoice={printData} id="list-invoice-print-doc" />
          <InvoicePrintDoc
            key={`sj-${previewRow.id}`}
            invoice={printData}
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
 * One bukti card: an image opens the in-app full-screen zoom Katalog photos use (ZoomableImage, with working ✕/Escape/backdrop close) rather than a new tab, which
 * could leave a mobile user with no way back to the drawer. A PDF still opens in a new tab (no in-app PDF viewer exists).
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
          {/* !object-contain: ZoomableImage's base class sets object-cover (right for a thumbnail, wrong here: a bukti must show the WHOLE receipt); equal-specificity
              utilities aren't guaranteed to win by order, so the ! is needed. */}
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
