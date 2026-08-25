"use client";

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

  // Browsers suggest document.title as the filename when "Save as PDF" is
  // picked in the print dialog — swapped to the invoice number for the
  // duration of the print flow (restored once the dialog closes, via
  // afterprint, so the browser tab title doesn't stay changed afterward)
  // instead of this app's usual page title. Per the user's request
  // 2026-08-26.
  function printInvoice() {
    const originalTitle = document.title;
    document.title = nomor;
    const restore = () => {
      document.title = originalTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  }

  return (
    <>
      <Button variant="clay" onClick={sendWA}>
        Kirim ke Pelanggan (WA)
      </Button>
      {/* Native browser print, not a PDF re-render — #invoice-doc (the
          printable document itself) is styled for this, and the app chrome
          around it (sidebar, PageHeader, this sidebar column) is already
          marked .no-print / hidden for print. Per the user's request
          2026-08-26. */}
      <Button variant="ghost" onClick={printInvoice}>
        Cetak Invoice
      </Button>
    </>
  );
}
