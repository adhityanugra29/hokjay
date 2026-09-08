"use client";

import { useState } from "react";
import { useLoadingOverlay } from "@/components/ui/LoadingOverlay";
import { useDialog } from "@/components/ui/Dialog";

/**
 * Shared Invoice/Surat Jalan PDF-building logic — extracted from
 * InvoiceActions.tsx (originally the only place these lived, on the
 * `/invoice/[id]` detail page) so the Invoice list's Preview drawer
 * (InvoiceListClient.tsx) can offer the same "Unduh Invoice (PDF)"/"Unduh
 * Surat Jalan (PDF)" buttons without duplicating the html2canvas/jsPDF
 * capture logic — same "one source, no drift" reasoning as BUG-013
 * (duplicated wa.me-link construction).
 *
 * Every function here targets a hidden InvoicePrintDoc instance by DOM
 * element id — a page can mount more than one (e.g. the detail page's own
 * "invoice-print-doc"/"surat-jalan-print-doc" ids, or the list's own
 * per-drawer ids) so this hook stays agnostic to which page is calling it.
 */
export function useInvoicePdfDownload() {
  const [downloading, setDownloading] = useState(false);
  const [downloadingSuratJalan, setDownloadingSuratJalan] = useState(false);
  const { show: showLoading, hide: hideLoading } = useLoadingOverlay();
  const { alert, prompt } = useDialog();

  /**
   * PDF generation itself — captures every `[data-print-page]` child of the
   * given hidden InvoicePrintDoc instance into one multi-page PDF (per-page
   * html2canvas + jsPDF, same approach as the Katalog PDF). Returns the
   * built jsPDF instance — caller decides whether to .save() it or turn it
   * into a File for sharing (see InvoiceActions.tsx's sendWA).
   */
  async function buildInvoicePdf(elementId: string = "invoice-print-doc") {
    const element = document.getElementById(elementId);
    if (!element) return null;

    // Logo + product photos aren't part of this doc beyond the HOJAY
    // logo, but the same "wait for every image to finish loading before
    // capturing" guard as the Katalog PDF applies regardless.
    const images = Array.from(element.querySelectorAll("img"));
    await Promise.all(
      images.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            })
      )
    );

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
    const pageEls = Array.from(element.querySelectorAll<HTMLElement>("[data-print-page]"));
    if (pageEls.length === 0) return null;

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageWidthMM = pdf.internal.pageSize.getWidth();
    const pageHeightMM = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pageEls.length; i++) {
      // Matches the Katalog PDF's own settings exactly (JPEG 0.94, scale
      // 2, FAST compression) — see InvoiceActions.tsx's original comment
      // for the full tuning history.
      const canvas = await html2canvas(pageEls[i], {
        scale: 2,
        useCORS: true,
        scrollY: -window.scrollY,
        scrollX: 0,
        logging: false,
        imageTimeout: 0,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.94);
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, 0, pageWidthMM, pageHeightMM, undefined, "FAST");
    }

    return pdf;
  }

  /**
   * Downloads the invoice as a PDF — replaces the old native window.print()
   * flow entirely (see InvoiceActions.tsx's original comment, 2026-08-27).
   */
  async function downloadInvoicePdf(nomor: string, elementId: string = "invoice-print-doc") {
    setDownloading(true);
    showLoading();
    try {
      const pdf = await buildInvoicePdf(elementId);
      if (!pdf) {
        await alert("Tidak ada halaman untuk diunduh.");
        return;
      }
      pdf.save(`${nomor}.pdf`);
    } catch (err) {
      console.error("Gagal membuat PDF invoice:", err);
      await alert(
        `Gagal membuat PDF invoice: ${err instanceof Error ? err.message : String(err)}\n\nCoba lagi, atau screenshot pesan ini untuk dilaporkan.`
      );
    } finally {
      setDownloading(false);
      hideLoading();
    }
  }

  /**
   * TASK-018 (2026-09-07) — Surat Jalan: same document, no prices, "SURAT
   * JALAN" title, plus a driver name — per the user's explicit choice, the
   * driver name is NEVER stored on the invoice ("driver bisa berganti
   * tergantung kondisi di lapangan"). On the detail page (InvoiceActions.tsx,
   * no override passed) it's still prompted fresh every single click. The
   * Invoice list's Preview drawer (2026-09-08) instead captures the name
   * once up front (as soon as the Surat Jalan tab opens) so it can also
   * show it in the on-screen preview, then passes that same value back in
   * here as `driverNameOverride` so this function doesn't ask a second
   * time — see InvoiceListClient.tsx's `ensureDriverName`. Either way, the
   * final value gets patched straight into the hidden InvoicePrintDoc's DOM
   * (the `data-driver-slot` element — InvoicePrintDoc.tsx) right before
   * html2canvas captures it — a plain DOM write, not React state, since
   * this function itself never needs to hold onto the value past the few
   * seconds it takes to generate this one PDF.
   */
  async function downloadSuratJalanPdf(nomor: string, elementId: string = "surat-jalan-print-doc", driverNameOverride?: string) {
    let driverName = driverNameOverride;
    if (driverName === undefined) {
      const typed = await prompt("Nama driver yang mengantar barang ini:", {
        title: "Nama Driver",
        placeholder: "Contoh: Pak Joko",
        confirmLabel: "Buat Surat Jalan",
      });
      if (typed === null) return; // cancelled
      driverName = typed;
    }

    setDownloadingSuratJalan(true);
    showLoading();
    try {
      const slot = document.querySelector<HTMLElement>(`#${elementId} [data-driver-slot]`);
      if (slot) slot.textContent = driverName.trim() || "—";

      const pdf = await buildInvoicePdf(elementId);
      if (!pdf) {
        await alert("Tidak ada halaman untuk diunduh.");
        return;
      }
      pdf.save(`SuratJalan-${nomor}.pdf`);
    } catch (err) {
      console.error("Gagal membuat PDF surat jalan:", err);
      await alert(
        `Gagal membuat PDF surat jalan: ${err instanceof Error ? err.message : String(err)}\n\nCoba lagi, atau screenshot pesan ini untuk dilaporkan.`
      );
    } finally {
      setDownloadingSuratJalan(false);
      hideLoading();
    }
  }

  return { downloading, downloadingSuratJalan, buildInvoicePdf, downloadInvoicePdf, downloadSuratJalanPdf };
}
