import { TableScroll } from "@/components/ui/Panel";
import { rupiah, formatDateLong, formatDateShort } from "@/lib/format";
import { displayDiskon, displayHarga, type InvoicePrintData } from "@/lib/invoiceDisplay";

/**
 * The on-screen invoice document — extracted from app/invoice/[id]/page.tsx
 * (previously inline JSX there, id="invoice-doc") so the same markup can
 * also power the Preview drawer on the Invoice list (/invoice), per the
 * user's request 2026-09-04. Reuses InvoicePrintData (already exactly the
 * shape both the PDF export and this on-screen view need — every field
 * either page loads is already present) rather than inventing a second
 * type. NOT the paginated layout InvoicePrintDoc.tsx captures for PDF
 * export — this is the single continuous view a person actually reads on
 * screen, same as before the extraction.
 */
export default function InvoiceDocument({ invoice, id }: { invoice: InvoicePrintData; id?: string }) {
  const totalDiskon = invoice.items.reduce((s, i) => s + displayDiskon(i) * i.qty, 0);
  const totalBelanja = invoice.items.reduce((s, i) => s + displayHarga(i) * i.qty, 0);

  return (
    <div id={id} className="border border-line bg-panel p-5 sm:p-9">
      {/* "INVOICE" centered above a logo+company-info / no.+tanggal row —
          per the user's request 2026-08-25. */}
      <h2 className="mb-5 text-center font-serif text-2xl tracking-[0.08em]">INVOICE</h2>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b-2 border-ink pb-6">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/hojay-2b-positif.png" alt="HOJAY Kitchen Equipment" width={110} height={61} className="mb-2 h-auto w-[110px]" />
          <div className="font-mono text-[0.72rem] leading-relaxed text-muted">
            CV. Horeca Jaya Abadi
            <br />
            Jalan H.Umar no 24, Bekasi Selatan
            <br />
            0877-8522-3394 · horecajaya.id@gmail.com
            <br />
            NPWP: 1000-0000-0770-6458
          </div>
        </div>
        <div className="text-right font-mono text-[0.75rem] leading-relaxed text-muted">
          No. {invoice.nomor}
          <br />
          Tanggal: {formatDateLong(invoice.tanggal)}
          <div className="mt-2 border-t border-line pt-2">
            Sales Consultant: {invoice.salesNama}
            {invoice.salesNomorHp && (
              <>
                <br />
                {invoice.salesNomorHp}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mb-7 flex flex-wrap items-start gap-x-12 gap-y-5">
        <div>
          <div className="mb-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-muted">Ditagihkan kepada</div>
          <div className="font-medium">{invoice.customerNama}</div>
          <div className="mt-1 font-mono text-[0.78rem] text-muted">{invoice.customerWhatsapp}</div>
        </div>
        <div className="max-w-[260px]">
          <div className="mb-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-muted">Alamat Pengiriman</div>
          <div className="text-[0.9rem] font-medium break-words">{invoice.shipAddress ?? "—"}</div>
        </div>
        <div>
          <div className="mb-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-muted">Tanggal Pengiriman</div>
          <div className="font-mono text-[0.78rem] text-muted">
            {invoice.tanggalKirim ? formatDateShort(invoice.tanggalKirim) : "—"}
            {invoice.kurir ? ` · ${invoice.kurir}` : ""}
          </div>
        </div>
      </div>

      <TableScroll>
        <table className="w-full min-w-[480px] border-collapse">
          <thead>
            <tr>
              {["Produk", "Qty", "Harga", "Diskon", "Subtotal"].map((h, idx) => (
                <th
                  key={h}
                  className={`border-b border-ink py-2 font-mono text-[0.68rem] uppercase text-muted ${
                    idx === 0 ? "text-left" : idx === 1 ? "text-center" : "text-right"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={idx}>
                <td className="border-b border-line py-3 text-[0.88rem]">
                  {item.namaSnapshot}
                  {item.dimensiSnapshot && (
                    <span className="ml-1.5 font-mono text-[0.72rem] text-muted">({item.dimensiSnapshot})</span>
                  )}
                  {item.isFlashSale && (
                    <span className="ml-1.5 font-mono text-[0.72rem] font-semibold text-accent-700">· Harga Special</span>
                  )}
                </td>
                <td className="border-b border-line py-3 text-center text-[0.88rem]">{item.qty}</td>
                <td className="border-b border-line py-3 text-right text-[0.88rem]">{rupiah(displayHarga(item))}</td>
                <td className="border-b border-line py-3 text-right text-[0.88rem]">{rupiah(displayDiskon(item))}</td>
                <td className="border-b border-line py-3 text-right text-[0.88rem]">{rupiah(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>

      <div className="ml-auto mt-5 w-full max-w-[260px] font-mono">
        <div className="flex justify-between py-1.5 text-[0.88rem]">
          <span>Total Belanja</span>
          <span>{rupiah(totalBelanja)}</span>
        </div>
        <div className="flex justify-between py-1.5 text-[0.88rem]">
          <span>Total Diskon</span>
          <span>{totalDiskon > 0 ? `− ${rupiah(totalDiskon)}` : rupiah(totalDiskon)}</span>
        </div>
        <div className="flex justify-between py-1.5 text-[0.88rem]">
          <span>Ongkos Kirim</span>
          <span>{rupiah(invoice.ongkosKirim ?? 0)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t-2 border-ink pt-3 font-serif text-lg font-semibold">
          <span>Total</span>
          <span>{rupiah(invoice.grandTotal)}</span>
        </div>
        {invoice.dpNominal ? (
          <>
            <div className="flex justify-between py-1.5 text-[0.88rem]">
              <span>DP ({formatDateShort(invoice.dpTanggal ?? invoice.tanggal)})</span>
              <span>− {rupiah(invoice.dpNominal)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-line pt-2 font-serif text-base font-semibold">
              <span>Sisa Tagihan</span>
              <span>{rupiah(invoice.grandTotal - invoice.dpNominal)}</span>
            </div>
          </>
        ) : null}
      </div>

      {/* Payment Details + closing logo/thank-you note side by side, same
          row — per the user's request 2026-08-27. break-inside-avoid keeps
          it from being split across a page boundary when printed. */}
      <div className="mt-9 flex flex-wrap items-start justify-between gap-6 border-t-2 border-ink pt-5 [break-inside:avoid]">
        <div className="font-mono text-[0.78rem] leading-relaxed">
          <div className="mb-1 text-[0.68rem] uppercase tracking-[0.1em] text-muted">Payment Details</div>
          <div>No. Rekening: 5771370277 (BCA)</div>
          <div>Atas Nama: Mohammad Andi Abdillah</div>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/hojay-2b-positif.png"
            alt="HOJAY Kitchen Equipment"
            width={90}
            height={50}
            className="h-auto w-[90px] opacity-80"
          />
          <div className="font-serif text-[0.82rem] italic text-muted">
            Thank you for entrusting
            <br />
            your kitchen equipment to us.
          </div>
          <div className="mt-1 font-mono text-[0.72rem] leading-relaxed text-muted">
            {invoice.salesNama}
            {invoice.salesNomorHp && (
              <>
                <br />
                {invoice.salesNomorHp}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
