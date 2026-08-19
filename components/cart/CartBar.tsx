"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCart } from "./CartProvider";
import { rupiah } from "@/lib/format";

export default function CartBar() {
  const { count, totalEstimate } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [downloading, setDownloading] = useState(false);

  // Matches the mockup: the cart bar only ever appears while browsing the
  // Katalog (and its Custom Order sub-page) — it disappears on every other
  // page even though the cart itself keeps its contents.
  if (!pathname.startsWith("/katalog")) return null;
  if (count === 0) return null;

  async function downloadCatalogPDF() {
    if (count === 0) {
      alert('Pilih dulu produk yang mau dimasukkan ke katalog (klik "+ Tambah ke Invoice" pada produk).');
      return;
    }
    const element = document.getElementById("catalog-print-doc");
    if (!element) return;

    setDownloading(true);
    try {
      const { default: html2pdf } = await import("html2pdf.js");
      const today = new Date();
      const tanggal = [
        String(today.getDate()).padStart(2, "0"),
        String(today.getMonth() + 1).padStart(2, "0"),
        today.getFullYear(),
      ].join("-");

      await html2pdf()
        .set({
          margin: 10,
          filename: `Katalog-CV-HORECA-JAYA_${tanggal}.pdf`,
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

  return (
    <div className="no-print fixed inset-x-0 bottom-16 z-30 flex flex-wrap items-center justify-between gap-3 bg-moss-deep px-6 py-3.5 text-white shadow-[0_-4px_16px_rgba(0,0,0,0.2)] md:bottom-0 md:pl-[254px]">
      <div className="font-mono text-[0.82rem]">
        <b className="text-gold">{count}</b> produk dipilih — total est. <b className="text-gold">{rupiah(totalEstimate)}</b>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={downloadCatalogPDF}
          disabled={downloading}
          className="rounded border border-white bg-transparent px-4.5 py-2 font-sans text-[0.85rem] font-medium text-white disabled:opacity-60"
        >
          {downloading ? "Menyiapkan PDF..." : "Unduh Katalog (PDF)"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/invoice/baru")}
          className="rounded border border-gold bg-gold px-4.5 py-2 font-sans text-[0.85rem] font-medium text-[#1b1200]"
        >
          Lanjut ke Invoice →
        </button>
      </div>
    </div>
  );
}
