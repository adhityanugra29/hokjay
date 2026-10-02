"use client";

import { useState } from "react";
import { rupiah, toWaPhone } from "@/lib/format";
import { useLoadingOverlay } from "@/components/ui/LoadingOverlay";
import { useDialog } from "@/components/ui/Dialog";
import { useInvoicePdfDownload } from "./useInvoicePdfDownload";

/**
 * The invoice detail page's document actions, split in two pieces per the
 * approved mockup (docs/SDD/mockups/invoice-detail-v7.html, TASK-039):
 *  - part="icons": "Kirim ke Pelanggan (WA)" and "Unduh Invoice (PDF)" as
 *    always-visible icon buttons, rendered over the invoice document's
 *    top-right corner (the user called the invoice download "crucial").
 *  - part="suratJalan": "Unduh Surat Jalan (PDF)" as a row inside the
 *    "Aksi lainnya" disclosure.
 * The WA/PDF logic itself is unchanged.
 */
export default function InvoiceActions({
  part,
  nomor,
  customerNama,
  customerWhatsapp,
  grandTotal,
}: {
  part: "icons" | "suratJalan";
  nomor: string;
  customerNama: string;
  customerWhatsapp?: string;
  grandTotal: number;
}) {
  const [sendingWA, setSendingWA] = useState(false);
  const { show: showLoading, hide: hideLoading } = useLoadingOverlay();
  const { alert } = useDialog();
  // Shared with InvoiceListClient.tsx's Preview drawer — see
  // useInvoicePdfDownload.ts for why this was extracted out of this file.
  const { downloading, downloadingSuratJalan, buildInvoicePdf, downloadInvoicePdf, downloadSuratJalanPdf } =
    useInvoicePdfDownload();

  function waMessage() {
    return `Halo ${customerNama}, berikut invoice ${nomor} dari CV HORECA JAYA.\nTotal: ${rupiah(
      grandTotal
    )}\nTerima kasih!`;
  }

  /**
   * wa.me can only pre-fill text, never attach a file — WhatsApp doesn't
   * expose a public link parameter for it, so historically this only ever
   * opened a chat with a message and staff had to separately download +
   * manually attach the PDF (per the user's question 2026-09-04, "kenapa
   * pengiriman PDF tidak bisa langsung ke nomor whatsapp yang dituju?").
   * Where the OS supports sharing files (`navigator.share` with a `files`
   * payload — real on mobile Chrome/Safari, absent on desktop browsers),
   * this now builds the PDF and hands it straight to the native share
   * sheet with WhatsApp as one tap away, no detour through the Downloads
   * folder. The target NUMBER still can't be picked programmatically —
   * that part of the flow is entirely inside WhatsApp's own UI once
   * shared, an OS/WhatsApp limitation with no public workaround (the only
   * real fix would be the WhatsApp Business Platform API, a different,
   * paid, Meta-approved integration — out of scope here). Where file
   * sharing isn't supported, falls back to the original text-only wa.me
   * link unchanged.
   */
  async function sendWA() {
    // typeof-checked (not just `"canShare" in navigator`) so a webview
    // that stubs these keys without real functions behind them falls
    // back safely instead of throwing "navigator.canShare is not a
    // function" — found while testing this against a simulated
    // no-file-share browser.
    const canShareFile =
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [new File([], "test.pdf", { type: "application/pdf" })] });

    if (!canShareFile) {
      const waPhone = toWaPhone(customerWhatsapp);
      const url = waPhone
        ? `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage())}`
        : `https://wa.me/?text=${encodeURIComponent(waMessage())}`;
      window.open(url, "_blank");
      return;
    }

    setSendingWA(true);
    showLoading();
    try {
      const pdf = await buildInvoicePdf();
      if (!pdf) {
        await alert("Tidak ada halaman untuk dikirim.");
        return;
      }
      const file = new File([pdf.output("blob")], `${nomor}.pdf`, { type: "application/pdf" });
      await navigator.share({ files: [file], text: waMessage() });
    } catch (err) {
      // AbortError = the person closed the share sheet without picking
      // anything — not a real failure, don't show an error for it.
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Gagal mengirim invoice via WA:", err);
      await alert(
        `Gagal menyiapkan invoice untuk dikirim: ${err instanceof Error ? err.message : String(err)}\n\nCoba lagi, atau screenshot pesan ini untuk dilaporkan.`
      );
    } finally {
      setSendingWA(false);
      hideLoading();
    }
  }

  if (part === "suratJalan") {
    return (
      <button
        type="button"
        onClick={() => downloadSuratJalanPdf(nomor)}
        disabled={downloadingSuratJalan}
        className="block w-full cursor-pointer px-6 py-2.5 text-left font-sans text-[0.82rem] font-semibold text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
      >
        {downloadingSuratJalan ? "Menyiapkan PDF..." : "Unduh Surat Jalan (PDF)"}
      </button>
    );
  }

  const iconCls =
    "group relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border disabled:cursor-not-allowed disabled:opacity-50";
  const tipCls =
    "pointer-events-none absolute top-[calc(100%+6px)] right-0 z-30 whitespace-nowrap rounded-md bg-ink px-2 py-1 font-sans text-[11px] font-bold text-accent opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100";

  return (
    <div className="no-print flex gap-2">
      <button
        type="button"
        onClick={sendWA}
        disabled={sendingWA}
        aria-label="Kirim ke Pelanggan (WA)"
        className={`${iconCls} border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5">
          <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.7-5.2A8.5 8.5 0 1 1 21 11.5Z" />
          <path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .8c-.9-.4-1.7-1.2-2.1-2.1l.8-1-1-2-1.2.4Z" />
        </svg>
        <span className={tipCls}>{sendingWA ? "Menyiapkan..." : "Kirim ke Pelanggan (WA)"}</span>
      </button>
      <button
        type="button"
        onClick={() => downloadInvoicePdf(nomor)}
        disabled={downloading}
        aria-label="Unduh Invoice (PDF)"
        className={`${iconCls} border-accent bg-accent text-ink hover:bg-accent-600`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5">
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 20h14" />
        </svg>
        <span className={tipCls}>{downloading ? "Menyiapkan PDF..." : "Unduh Invoice (PDF)"}</span>
      </button>
    </div>
  );
}
