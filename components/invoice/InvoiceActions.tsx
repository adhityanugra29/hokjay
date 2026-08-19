"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { rupiah } from "@/lib/format";

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

  async function downloadPDF() {
    const element = document.getElementById("invoice-doc");
    if (!element) return;

    setDownloading(true);
    try {
      const { default: html2pdf } = await import("html2pdf.js");
      await html2pdf()
        .set({
          margin: 10,
          filename: `${nomor}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(element)
        .save();
    } finally {
      setDownloading(false);
    }
  }

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

  return (
    <>
      <Button variant="ghost" onClick={downloadPDF} disabled={downloading}>
        {downloading ? "Menyiapkan PDF..." : "Preview PDF"}
      </Button>
      <Button variant="clay" onClick={sendWA}>
        Kirim ke Pelanggan (WA)
      </Button>
    </>
  );
}
