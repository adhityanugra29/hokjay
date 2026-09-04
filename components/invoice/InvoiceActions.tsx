"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { rupiah, toWaPhone } from "@/lib/format";
import { useLoadingOverlay } from "@/components/ui/LoadingOverlay";
import { useDialog } from "@/components/ui/Dialog";

export default function InvoiceActions({
  nomor,
  customerNama,
  customerWhatsapp,
  grandTotal,
}: {
  nomor: string;
  customerNama: string;
  customerWhatsapp?: string;
  grandTotal: number;
}) {
  const [downloading, setDownloading] = useState(false);
  const [sendingWA, setSendingWA] = useState(false);
  const { show: showLoading, hide: hideLoading } = useLoadingOverlay();
  const { alert } = useDialog();

  function waMessage() {
    return `Halo ${customerNama}, berikut invoice ${nomor} dari CV HORECA JAYA.\nTotal: ${rupiah(
      grandTotal
    )}\nTerima kasih!`;
  }

  /**
   * PDF generation itself, pulled out of downloadInvoicePdf so sendWA can
   * reuse it (see that function's comment for why the per-page-canvas
   * approach). Returns the built jsPDF instance — caller decides whether
   * to .save() it or turn it into a File for sharing.
   */
  async function buildInvoicePdf() {
    const element = document.getElementById("invoice-print-doc");
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
      // 2, FAST compression) — per the user's explicit request
      // 2026-08-28 ("contoh cara pengerjaan di pdf katalog"). PNG (tried
      // first, to fix an earlier blur report) turned out both still not
      // fully satisfying and heavy (~20MB/page at scale 3, still notably
      // larger than JPEG even after dropping to scale 2) — Katalog's own
      // JPEG 0.94 is the value already proven crisp+light after that
      // PDF's own multi-round tuning earlier this session, so this
      // stops re-deriving the same tradeoff from scratch for Invoice.
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

  /**
   * Downloads the invoice as a PDF — html2canvas + jsPDF, per-page capture,
   * same approach as the Katalog PDF (components/katalog/KatalogClient.tsx).
   * Replaces the old native window.print() flow entirely: per the user's
   * report 2026-08-27, a long invoice's content got visibly cut off when
   * printed — #invoice-doc sat inside a CSS grid (the 2-column layout with
   * the status sidebar), a well-known source of print-pagination bugs
   * across browsers. Capturing each page as its own independent image
   * (see InvoicePrintDoc.tsx) sidesteps browser print pagination
   * altogether, the same fix that made the Katalog PDF reliable.
   */
  async function downloadInvoicePdf() {
    setDownloading(true);
    showLoading();
    try {
      const pdf = await buildInvoicePdf();
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

  return (
    <>
      <Button variant="clay" onClick={sendWA} disabled={sendingWA}>
        {sendingWA ? "Menyiapkan..." : "Kirim ke Pelanggan (WA)"}
      </Button>
      <Button variant="ghost" onClick={downloadInvoicePdf} disabled={downloading}>
        {downloading ? "Menyiapkan PDF..." : "Unduh Invoice (PDF)"}
      </Button>
    </>
  );
}
