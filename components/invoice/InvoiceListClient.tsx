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
 */
export default function InvoiceListClient({ rows }: { rows: InvoiceRow[] }) {
  const [filter, setFilter] = useState<FilterKey>("semua");
  const [previewId, setPreviewId] = useState<string | null>(null);
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

  return (
    <>
      {/* Summary cards — pure display, not clickable (the pill row below is
          the only filter control). Both numbers track whichever pill is
          active: per the user's request 2026-09-07, this replaces the old
          4 independently-clickable/independently-counted cards ("Perlu
          ditindak", "Belum bayar", "Sudah DP", "Lunas {bulan}") with 2 that
          read together as "of what I'm looking at right now, how many and
          how much". */}
      <div className="mb-6 grid grid-cols-2 gap-3.5">
        <div className="min-w-0 rounded-xl bg-ink p-4.5 text-white shadow-sm">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">Jumlah Invoice</div>
          <div className="mt-0.5 font-sans text-[1.25rem] font-extrabold">{filtered.length}</div>
        </div>
        <div className="min-w-0 rounded-xl bg-panel p-4.5 shadow-sm">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Total Nilai Invoice</div>
          <div className="mt-0.5 truncate font-sans text-[1.25rem] font-extrabold">{rupiah(totalNilaiInvoice)}</div>
        </div>
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
                  onClick={() => openPreview(r.id)}
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
          {/* Hidden, hidden-from-view paginated layouts the download
              buttons above actually capture (html2canvas + jsPDF) — same
              approach as app/invoice/[id]/page.tsx's own two instances.
              Keyed on the row id so switching preview rows always starts
              each instance's adaptive page-packing fresh instead of
              carrying over a previous invoice's measured header/footer
              heights. Mounted only while a row is being previewed. */}
          <InvoicePrintDoc key={`inv-${previewRow.id}`} invoice={previewRow.printData} id="list-invoice-print-doc" />
          <InvoicePrintDoc
            key={`sj-${previewRow.id}`}
            invoice={previewRow.printData}
            mode="surat-jalan"
            id="list-surat-jalan-print-doc"
          />
        </div>
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
