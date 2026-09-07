// Plain shared invoice-item display helpers — deliberately NOT in a
// "use client" module. InvoicePrintDoc.tsx (client-only, PDF export) and
// InvoiceDocument.tsx (rendered from the SERVER on /invoice/[id] and
// app/invoice/page.tsx) both need these, and a Server Component cannot call
// a function value-imported from a "use client" module (Next.js throws
// "Attempted to call displayDiskon() from the server but displayDiskon is
// on the client" — React minified error #441). These were originally
// exported straight from InvoicePrintDoc.tsx, which worked for the PDF
// export path but broke invoice detail/list pages as soon as
// InvoiceDocument.tsx started importing them for server-side rendering,
// per the user's bug report 2026-09-04 ("tidak bisa untuk generate
// invoice" / Chrome's "This page couldn't load — A server error
// occurred" interstitial). Moving them here (no client dependency — pure
// data in, number out) fixes it for both callers.

export interface InvoicePrintItem {
  namaSnapshot: string;
  /** e.g. "120x80x60 cm" — shown right after the product name. Per the user's request 2026-08-28. */
  dimensiSnapshot?: string;
  qty: number;
  hargaJual: number;
  /** Shown in its own table column — per the user's request 2026-08-29 (brought back after being hidden 2026-08-28). */
  diskonPerUnit: number;
  subtotal: number;
  /** Snapshotted at add-to-cart time (see models/Invoice.ts). Per the user's request 2026-08-29. */
  isFlashSale?: boolean;
  /** Only meaningfully populated for a Flash Sale line — see displayDiskon below. Per the user's request 2026-08-29. */
  hargaRekomendasiSnapshot?: number;
}

export interface InvoicePrintData {
  nomor: string;
  tanggal: string;
  customerNama: string;
  customerWhatsapp?: string;
  shipAddress?: string;
  tanggalKirim?: string;
  kurir?: string;
  salesNama: string;
  salesNomorHp?: string;
  items: InvoicePrintItem[];
  subtotalProduk: number;
  ongkosKirim: number;
  grandTotal: number;
  dpNominal?: number;
  dpTanggal?: string;
  /**
   * Proof-of-transfer for the DP and the full settlement, respectively —
   * both already captured today (DpForm.tsx/PaymentForm.tsx's own "Bukti
   * Transfer" UploadBox, stored as invoice.dp.buktiUrl/invoice.payment.
   * buktiUrl) but never surfaced anywhere for viewing. Only populated by
   * app/invoice/page.tsx (the list's Preview drawer, TASK-016) — the
   * detail page (app/invoice/[id]/page.tsx) deliberately leaves these
   * undefined per the user's explicit scope choice 2026-09-07 ("Drawer
   * Preview di list Invoice saja"). Absent (not just empty-string) when
   * paid in cash — PaymentForm.tsx clears buktiUrl for "tunai/cash".
   */
  dpBuktiUrl?: string;
  paymentBuktiUrl?: string;
  /** Only meaningful alongside paymentBuktiUrl — labels the "Bukti Pelunasan" card with when/how much was actually recorded as received. */
  paymentTanggalBayar?: string;
  paymentNominalDiterima?: number;
  /**
   * Surat Jalan's driver name — deliberately NEVER populated server-side
   * and NEVER stored anywhere. Per the user's explicit request 2026-09-07
   * ("jangan isi nama driver di invoice, karena driver bisa berganti
   * tergantung kondisi di lapangan"): typed fresh into a prompt() each
   * time "Unduh Surat Jalan (PDF)" is clicked (see InvoiceActions.tsx),
   * patched directly into the hidden InvoicePrintDoc's DOM right before
   * html2canvas captures it. This field only exists so that component has
   * somewhere to read the value from — it's not meant to come from a
   * server-built `printData` object.
   */
  namaDriver?: string;
}

/**
 * The Diskon figure to actually show for a line — diskonPerUnit itself is
 * always 0 for a Flash Sale item (Diskon is locked out while one is
 * active), so for those this shows Harga Rekomendasi − hargaJual instead:
 * the discount the Flash Sale price itself represents. Per the user's
 * request 2026-08-29 ("tampilkan diskonnya dari selisih harga rekomendasi
 * dengan harga flash sale").
 */
export function displayDiskon(item: InvoicePrintItem): number {
  if (item.isFlashSale && item.hargaRekomendasiSnapshot != null) {
    return Math.max(0, item.hargaRekomendasiSnapshot - item.hargaJual);
  }
  return item.diskonPerUnit;
}

/**
 * The "Harga" column for a Flash Sale line shows Harga Rekomendasi, not
 * the Flash Sale price itself — the Flash Sale price shows in Subtotal
 * instead (Diskon in between makes the arithmetic read correctly: Harga −
 * Diskon = the Flash Sale price actually charged). Per the user's request
 * 2026-08-29 ("Harga (Harga rekomendasi) | Diskon | Subtotal (harga
 * flashsalenya di subtotal)").
 */
export function displayHarga(item: InvoicePrintItem): number {
  if (item.isFlashSale && item.hargaRekomendasiSnapshot != null) {
    return item.hargaRekomendasiSnapshot;
  }
  return item.hargaJual;
}
