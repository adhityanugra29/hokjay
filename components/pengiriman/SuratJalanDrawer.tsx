"use client";

import { useState } from "react";
import InvoiceDocument from "@/components/invoice/InvoiceDocument";
import InvoicePrintDoc from "@/components/invoice/InvoicePrintDoc";
import { useInvoicePdfDownload } from "@/components/invoice/useInvoicePdfDownload";
import { useInvoicePrintData } from "@/components/invoice/useInvoicePrintData";
import { Button } from "@/components/ui/Button";
import { useDialog } from "@/components/ui/Dialog";

const PRINT_DOC_ID = "pengiriman-surat-jalan-print-doc";

/**
 * Surat Jalan for one shipment, opened from /pengiriman. Same document and PDF as the Invoice list's Preview drawer "Surat Jalan" tab (InvoiceDocument /
 * InvoicePrintDoc mode="surat-jalan"): no prices, plus a driver name that is only typed in here, never stored (the driver can change on the day).
 */
export default function SuratJalanDrawer({ invoiceId, nomor, customerNama, onClose }: { invoiceId: string; nomor: string; customerNama: string; onClose: () => void }) {
  const [driverName, setDriverName] = useState<string | null>(null);
  const { downloadingSuratJalan, downloadSuratJalanPdf } = useInvoicePdfDownload();
  const { prompt } = useDialog();
  const printResult = useInvoicePrintData(invoiceId);
  const printData = printResult?.data;

  /** Always re-asks, even if a name is already set — used by "Ubah". */
  async function promptDriverName(): Promise<string | null> {
    const typed = await prompt("Nama driver yang mengantar barang ini:", {
      title: "Nama Driver",
      placeholder: "Contoh: Pak Joko",
      confirmLabel: "Simpan",
    });
    if (typed === null) return null; // cancelled
    const value = typed.trim() || "—";
    setDriverName(value);
    return value;
  }

  return (
    <>
      <div className="no-print fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
        <div className="flex h-full w-full max-w-3xl flex-col overflow-y-auto bg-panel shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-line bg-surface px-5 py-4">
            <div>
              <div className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-muted">Surat Jalan · {nomor}</div>
              <h2 className="font-sans text-[1rem] font-extrabold text-ink">{customerNama}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="flex h-9 w-9 cursor-pointer items-center justify-center border border-line text-lg text-ink hover:border-accent hover:text-accent-700"
            >
              ✕
            </button>
          </div>
          <div className="p-5">
            {!printData ? (
              <div className="py-10 text-center font-mono text-[0.8rem] text-muted">{printResult?.error ?? "Memuat surat jalan..."}</div>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="font-mono text-[0.72rem] text-muted">
                    Nama Driver: <span className="font-bold text-ink">{driverName ?? "belum diisi"}</span>{" "}
                    <button
                      type="button"
                      onClick={() => promptDriverName()}
                      className="cursor-pointer text-accent-700 underline underline-offset-2 hover:text-accent-800"
                    >
                      {driverName ? "Ubah" : "Isi sekarang"}
                    </button>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      const name = driverName ?? (await promptDriverName());
                      if (name === null) return;
                      downloadSuratJalanPdf(nomor, PRINT_DOC_ID, name);
                    }}
                    disabled={downloadingSuratJalan}
                  >
                    {downloadingSuratJalan ? "Menyiapkan PDF..." : "Unduh Surat Jalan (PDF)"}
                  </Button>
                </div>
                <InvoiceDocument invoice={{ ...printData, namaDriver: driverName ?? undefined }} mode="surat-jalan" />
              </>
            )}
          </div>
        </div>
      </div>
      {/* Hidden, off-screen layout the download button captures (html2canvas + jsPDF). A separate block from the overlay on purpose: as a child of its flex row, its
          794px width would push the visible panel (same reason as the Invoice list's drawer, BUG-019). Keyed on the invoice so page-packing starts fresh. */}
      {printData && <InvoicePrintDoc key={`sj-${invoiceId}`} invoice={printData} mode="surat-jalan" id={PRINT_DOC_ID} />}
    </>
  );
}
