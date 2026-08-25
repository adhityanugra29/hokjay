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

  return (
    <Button variant="clay" onClick={sendWA}>
      Kirim ke Pelanggan (WA)
    </Button>
  );
}
