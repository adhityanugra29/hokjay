"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { rupiah, toWaPhone } from "@/lib/format";
import { useLoadingOverlay } from "@/components/ui/LoadingOverlay";
import { useDialog } from "@/components/ui/Dialog";
import { useInvoicePdfDownload } from "./useInvoicePdfDownload";

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

  return (
    <>
      <Button variant="clay" onClick={sendWA} disabled={sendingWA}>
        {sendingWA ? "Menyiapkan..." : "Kirim ke Pelanggan (WA)"}
      </Button>
      <Button variant="ghost" onClick={() => downloadInvoicePdf(nomor)} disabled={downloading}>
        {downloading ? "Menyiapkan PDF..." : "Unduh Invoice (PDF)"}
      </Button>
      <Button variant="ghost" onClick={() => downloadSuratJalanPdf(nomor)} disabled={downloadingSuratJalan}>
        {downloadingSuratJalan ? "Menyiapkan PDF..." : "Unduh Surat Jalan (PDF)"}
      </Button>
    </>
  );
}
