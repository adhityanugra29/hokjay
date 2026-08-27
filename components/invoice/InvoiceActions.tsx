"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { rupiah } from "@/lib/format";
import { useLoadingOverlay } from "@/components/ui/LoadingOverlay";

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
  const { show: showLoading, hide: hideLoading } = useLoadingOverlay();

  function sendWA() {
    const phone = (customerWhatsapp ?? "").replace(/[^0-9]/g, "");
    const waPhone = phone.startsWith("0") ? `62${phone.slice(1)}` : phone;
    const text = `Halo ${customerNama}, berikut invoice ${nomor} dari CV HORECA JAYA.\nTotal: ${rupiah(
      grandTotal
    )}\nTerima kasih!`;
    const url = waPhone
      ? `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
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
    const element = document.getElementById("invoice-print-doc");
    if (!element) return;

    setDownloading(true);
    showLoading();
    try {
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
      if (pageEls.length === 0) {
        alert("Tidak ada halaman untuk diunduh.");
        return;
      }

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

      pdf.save(`${nomor}.pdf`);
    } catch (err) {
      console.error("Gagal membuat PDF invoice:", err);
      alert(
        `Gagal membuat PDF invoice: ${err instanceof Error ? err.message : String(err)}\n\nCoba lagi, atau screenshot pesan ini untuk dilaporkan.`
      );
    } finally {
      setDownloading(false);
      hideLoading();
    }
  }

  return (
    <>
      <Button variant="clay" onClick={sendWA}>
        Kirim ke Pelanggan (WA)
      </Button>
      <Button variant="ghost" onClick={downloadInvoicePdf} disabled={downloading}>
        {downloading ? "Menyiapkan PDF..." : "Unduh Invoice (PDF)"}
      </Button>
    </>
  );
}
