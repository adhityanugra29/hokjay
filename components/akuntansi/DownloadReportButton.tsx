"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PDF_JPEG_QUALITY, PDF_RENDER_SCALE } from "@/lib/pdfExport";

const TITLES: Record<string, string> = {
  "/akuntansi/neraca-saldo": "Neraca-Saldo",
  "/akuntansi/laba-rugi": "Laba-Rugi",
  "/akuntansi/neraca": "Neraca",
};

function today() {
  const d = new Date();
  return [String(d.getDate()).padStart(2, "0"), String(d.getMonth() + 1).padStart(2, "0"), d.getFullYear()].join("-");
}

/** Downloads whatever report page currently renders #report-doc as a PDF. */
export default function DownloadReportButton() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  async function download() {
    const element = document.getElementById("report-doc");
    if (!element) return;
    setLoading(true);
    try {
      const { default: html2pdf } = await import("html2pdf.js");
      const name = TITLES[pathname] ?? "Laporan";
      await html2pdf()
        .set({
          margin: 10,
          filename: `${name}_${today()}.pdf`,
          image: { type: "jpeg", quality: PDF_JPEG_QUALITY },
          html2canvas: { scale: PDF_RENDER_SCALE, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(element)
        .save();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="ghost" onClick={download} disabled={loading}>
      {loading ? "Menyiapkan..." : "Unduh PDF"}
    </Button>
  );
}
