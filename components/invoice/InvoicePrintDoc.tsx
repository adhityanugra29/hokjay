"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { rupiah, formatDateShort, formatDateLong } from "@/lib/format";

export interface InvoicePrintItem {
  namaSnapshot: string;
  /** e.g. "120x80x60 cm" — shown right after the product name. Per the user's request 2026-08-28. */
  dimensiSnapshot?: string;
  qty: number;
  hargaJual: number;
  subtotal: number;
  /** Snapshotted at add-to-cart time (see models/Invoice.ts). Per the user's request 2026-08-29. */
  isFlashSale?: boolean;
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
}

// Same A4-at-96dpi math as the Katalog PDF (CatalogPrintDoc.tsx) — 794px
// wide container, 297mm page height maps to ≈1123px at this scale.
const PAGE_WIDTH_PX = 794;
const PAGE_HEIGHT_PX = Math.round((297 * 794) / 210);
const PAGE_VPAD_PX = 72; // p-9 top+bottom, exact.
const TABLE_HEADER_PX = 46; // repeats at the top of every page that has item rows.
const ITEM_ROW_PX = 55; // safety-padded above the real ~44px single-line row, room for an occasional 2-line product name.
// Used only for the handful of renders before the header/footer refs land
// their real measured height (see below) — generous on purpose so a
// transient under-measurement never lets a page overpack before the real
// number arrives.
const DEFAULT_HEADER_HEIGHT_PX = 260;
const DEFAULT_FOOTER_HEIGHT_PX = 300; // bumped after adding the closing logo + thank-you line, 2026-08-27

/**
 * Off-screen multi-page invoice layout, captured page-by-page by
 * InvoiceActions' download handler (html2canvas + jsPDF, same pattern as
 * the Katalog PDF) — replaces native window.print() entirely. Per the
 * user's report 2026-08-27 that a long invoice's content got visibly cut
 * off when printed: #invoice-doc sat inside a CSS grid (the 2-column
 * layout with the status sidebar) and grid items are a well-known source
 * of print-pagination bugs across browsers — content that should have
 * flowed onto a second physical page instead got clipped. Capturing each
 * page as its own independent image (like the Katalog PDF, after its own
 * multi-attempt fix for a similar class of problem) sidesteps browser
 * print pagination altogether.
 *
 * Adaptive per-page row packing — a page always gets as many item rows as
 * safely fit its real remaining height (page 1 loses the measured header
 * block's height up front; the closing totals/payment-details block is
 * placed on whichever page has room for it after every row is packed, or
 * gets a page of its own if none do). Header/footer heights are measured
 * via ref rather than guessed, since either can vary in height (Dikirim
 * ke / Kurir being present or not; DP being recorded or not).
 */
export default function InvoicePrintDoc({ invoice }: { invoice: InvoicePrintData }) {
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const [footerHeight, setFooterHeight] = useState<number | null>(null);

  useEffect(() => {
    if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight);
    if (footerRef.current) setFooterHeight(footerRef.current.offsetHeight);
    // Depends on the actual invoice content (item count changes the total
    // document height but not header/footer height directly — kept for
    // safety since dp/shipAddress presence can change between renders of
    // the same mounted component in principle).
  }, [invoice]);

  const header = headerHeight ?? DEFAULT_HEADER_HEIGHT_PX;
  const footer = footerHeight ?? DEFAULT_FOOTER_HEIGHT_PX;

  // Flash Sale items lead the item list — per the user's request
  // 2026-08-29, same "always first" treatment as the Katalog grid/PDF.
  // A stable partition (not a comparator-based sort) so the relative
  // order within each group is left exactly as the invoice stored it.
  const sortedItems = [
    ...invoice.items.filter((it) => it.isFlashSale),
    ...invoice.items.filter((it) => !it.isFlashSale),
  ];

  // Pass 1: pack item rows into pages by remaining height.
  const rowPages: InvoicePrintItem[][] = [];
  {
    let i = 0;
    while (i < sortedItems.length) {
      const isFirstPage = rowPages.length === 0;
      const budget = PAGE_HEIGHT_PX - PAGE_VPAD_PX - TABLE_HEADER_PX - (isFirstPage ? header : 0);
      const page: InvoicePrintItem[] = [];
      let used = 0;
      while (i < sortedItems.length) {
        if (page.length > 0 && used + ITEM_ROW_PX > budget) break;
        used += ITEM_ROW_PX;
        page.push(sortedItems[i]);
        i++;
      }
      rowPages.push(page);
    }
  }
  if (rowPages.length === 0) rowPages.push([]); // no items (shouldn't happen, but never emit zero pages)

  // Pass 2: does the totals/payment-details footer fit on the last page
  // alongside its rows? If not, it gets a page of its own.
  const lastPageIsFirst = rowPages.length === 1;
  const lastPageRowCount = rowPages[rowPages.length - 1].length;
  const lastPageBudget =
    PAGE_HEIGHT_PX - PAGE_VPAD_PX - TABLE_HEADER_PX - (lastPageIsFirst ? header : 0) - lastPageRowCount * ITEM_ROW_PX;
  const footerJoinsLastPage = footer <= lastPageBudget;

  const totalPages = rowPages.length + (footerJoinsLastPage ? 0 : 1);

  const totalsBlock = (
    <div ref={footerRef}>
      <div className="ml-auto mt-5 w-full max-w-[260px] font-mono">
        <div className="flex justify-between py-1.5 text-[0.88rem]">
          <span>Subtotal Produk</span>
          <span>{rupiah(invoice.subtotalProduk)}</span>
        </div>
        <div className="flex justify-between py-1.5 text-[0.88rem]">
          <span>Ongkos Kirim</span>
          <span>{rupiah(invoice.ongkosKirim)}</span>
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
          row — per the user's request 2026-08-27 (was stacked below
          before). Translated from the user's own Indonesian wording
          ("Terimakasih sudah mempercayakan Peralatan dapur anda kepada
          kami") rather than the earlier English attempt, which read
          backwards. */}
      <div className="mt-9 flex flex-wrap items-start justify-between gap-6 border-t-2 border-ink pt-5">
        <div className="font-mono text-[0.78rem] leading-relaxed">
          <div className="mb-1 text-[0.68rem] uppercase tracking-[0.1em] text-muted">Payment Details</div>
          <div>No. Rekening: 5771370277 (BCA)</div>
          <div>Atas Nama: Mohammad Andi Abdillah</div>
        </div>
        {/* Logo flush right, sentence wrapped to 2 short lines instead of
            one long one — more compact. Per the user's request
            2026-08-27. */}
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
          {/* Sales name + phone repeated here at the very close of the
              document — per the user's request 2026-08-28. */}
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

  const headerBlock = (
    <div ref={headerRef}>
      <h2 className="mb-5 text-center font-serif text-2xl tracking-[0.08em]">INVOICE</h2>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b-2 border-ink pb-6">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/hojay-2b-positif.png"
            alt="HOJAY Kitchen Equipment"
            width={110}
            height={61}
            className="mb-2 h-auto w-[110px]"
          />
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
          {/* Sales moved up here, level with the CV. Horeca Jaya block on
              the left, right below Tanggal — was down in the 3-column row
              below. Per the user's request 2026-08-27. */}
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

      {/* 3 columns, wider gap between them. Per the user's request
          2026-08-27 ("terlalu mepet"). */}
      <div className="mb-7 flex flex-wrap items-start gap-x-12 gap-y-5">
        <div>
          <div className="mb-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-muted">Ditagihkan kepada</div>
          <div className="font-medium">{invoice.customerNama}</div>
          <div className="mt-1 font-mono text-[0.78rem] text-muted">{invoice.customerWhatsapp}</div>
        </div>
        <div>
          <div className="mb-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-muted">Alamat Pengiriman</div>
          <div className="text-[0.9rem] font-medium">{invoice.shipAddress ?? "—"}</div>
        </div>
        <div>
          <div className="mb-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-muted">Tanggal Pengiriman</div>
          <div className="font-mono text-[0.78rem] text-muted">
            {invoice.tanggalKirim ? formatDateShort(invoice.tanggalKirim) : "—"}
            {invoice.kurir ? ` · ${invoice.kurir}` : ""}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-0 overflow-hidden print:hidden">
      <div id="invoice-print-doc" data-ready="true" className="font-sans text-ink">
        {rowPages.map((rows, pi) => {
          const isFirstPage = pi === 0;
          const isLastRowPage = pi === rowPages.length - 1;
          return (
            <div
              key={pi}
              data-print-page={pi}
              className="flex flex-col bg-panel"
              style={{ width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX, overflow: "hidden" }}
            >
              <div className="p-9">
                {isFirstPage && headerBlock}
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {["Produk", "Qty", "Harga", "Subtotal"].map((h, idx) => (
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
                    {rows.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border-b border-line py-3 text-[0.88rem]">
                          {item.namaSnapshot}
                          {item.dimensiSnapshot && (
                            <span className="ml-1.5 font-mono text-[0.72rem] text-muted">
                              ({item.dimensiSnapshot})
                            </span>
                          )}
                          {/* Per the user's request 2026-08-29 — plain
                              text, not a colored banner (see the same
                              wording on Katalog PDF's dedicated section). */}
                          {item.isFlashSale && (
                            <span className="ml-1.5 font-mono text-[0.72rem] font-semibold text-accent-700">
                              · Harga Special
                            </span>
                          )}
                        </td>
                        <td className="border-b border-line py-3 text-center text-[0.88rem]">{item.qty}</td>
                        <td className="border-b border-line py-3 text-right text-[0.88rem]">{rupiah(item.hargaJual)}</td>
                        <td className="border-b border-line py-3 text-right text-[0.88rem]">{rupiah(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {isLastRowPage && footerJoinsLastPage && totalsBlock}
              </div>
            </div>
          );
        })}
        {!footerJoinsLastPage && (
          <div
            data-print-page={rowPages.length}
            className="flex flex-col bg-panel"
            style={{ width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX, overflow: "hidden" }}
          >
            <div className="p-9">{totalsBlock}</div>
          </div>
        )}
      </div>
      {/* totalPages isn't rendered anywhere — kept for potential future use
          (e.g. a "Halaman X dari Y" footer) without recomputing it. */}
      <span className="hidden" data-total-pages={totalPages} />
    </div>
  );
}
