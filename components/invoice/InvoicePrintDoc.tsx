"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { rupiah, formatDateShort, formatDateLong, autoKapital } from "@/lib/format";
import { displayDiskon, displayHarga, type InvoicePrintItem, type InvoicePrintData } from "@/lib/invoiceDisplay";

// Same A4-at-96dpi math as the Katalog PDF (CatalogPrintDoc.tsx) — 794px
// wide container, 297mm page height maps to ≈1123px at this scale.
const PAGE_WIDTH_PX = 794;
const PAGE_HEIGHT_PX = Math.round((297 * 794) / 210);
const PAGE_VPAD_PX = 72; // p-9 top+bottom, exact.
const TABLE_HEADER_PX = 46; // repeats at the top of every page that has item rows.
const ITEM_ROW_PX = 55; // safety-padded above the real ~44px single-line row, room for an occasional 2-line product name.
// Used only until the header/footer refs land their real measured height; generous on purpose so a transient under-measurement never lets a page overpack.
const DEFAULT_HEADER_HEIGHT_PX = 260;
const DEFAULT_FOOTER_HEIGHT_PX = 300; // includes the closing logo + thank-you line
const DEFAULT_SK_HEIGHT_PX = 160; // Syarat & Ketentuan's own pre-measurement estimate, see its own placement logic below.

/**
 * Off-screen multi-page invoice layout, captured page-by-page by InvoiceActions' download handler (html2canvas + jsPDF, same pattern as the Katalog PDF).
 * Replaces native window.print(), which visibly cut off long invoices (grid items are a known source of print-pagination bugs).
 * Adaptive row packing: a page gets as many item rows as safely fit its remaining height (page 1 loses the measured header); the closing totals/payment
 * block goes on whichever page has room after every row is packed, else on its own page. Header/footer heights are measured via ref since they vary
 * (Dikirim ke / Kurir present or not; DP recorded or not).
 */
export default function InvoicePrintDoc({
  invoice,
  mode = "invoice",
  id = "invoice-print-doc",
}: {
  invoice: InvoicePrintData;
  /**
   * "surat-jalan": the same document minus every price (no Harga/Diskon/Subtotal columns, no totals/Payment Details), titled "SURAT JALAN", plus a driver-name line.
   * A second hidden instance renders alongside the invoice one (app/invoice/[id]/page.tsx) so both PDFs stay independently downloadable.
   */
  mode?: "invoice" | "surat-jalan";
  /** Lets a second instance coexist in the DOM with its own id — defaults to the original hardcoded value so the existing "invoice" caller needs no change. */
  id?: string;
}) {
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  // Syarat & Ketentuan is measured SEPARATELY from the rest of the footer: every page is fixed-height with `overflow: hidden` (needed for the per-page capture),
  // so when the whole footer block (DP + long Catatan + long S&K) outgrew a page, the excess was silently clipped, and S&K sits last so it vanished first with no
  // error. Its own measured block lets it fall back to its own page.
  const skRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const [footerHeight, setFooterHeight] = useState<number | null>(null);
  const [skHeight, setSkHeight] = useState<number | null>(null);

  useEffect(() => {
    if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight);
    if (footerRef.current) setFooterHeight(footerRef.current.offsetHeight);
    if (skRef.current) setSkHeight(skRef.current.offsetHeight);
    // Depends on the invoice content: dp/shipAddress presence can change header/footer height between renders.
  }, [invoice]);

  const header = headerHeight ?? DEFAULT_HEADER_HEIGHT_PX;
  const footer = footerHeight ?? DEFAULT_FOOTER_HEIGHT_PX;

  // Flash Sale items lead the item list (stable partition, so order within each group is as stored). Jasa lines come last; on a Surat Jalan they are left out
  // when there are products (only what is physically shipped), but a jasa-ONLY invoice still lists them.
  const hasJasa = invoice.items.some((it) => it.isJasa);
  const jasaOnly = hasJasa && invoice.items.every((it) => it.isJasa);
  const productItems = invoice.items.filter((it) => !it.isJasa);
  const sortedItems = [
    ...productItems.filter((it) => it.isFlashSale),
    ...productItems.filter((it) => !it.isFlashSale),
    ...(mode === "surat-jalan" && !jasaOnly ? [] : invoice.items.filter((it) => it.isJasa)),
  ];

  const syaratKetentuanPoints = (invoice.syaratKetentuan ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const sk = syaratKetentuanPoints.length === 0 ? 0 : (skHeight ?? DEFAULT_SK_HEIGHT_PX);

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

  // Pass 2: does the totals/payment footer (and S&K alongside it) fit on the last page with its rows? Three tiers, checked in order, so S&K only spills onto its
  // OWN page when it fits nowhere else (see skRef).
  const lastPageIsFirst = rowPages.length === 1;
  const lastPageRowCount = rowPages[rowPages.length - 1].length;
  const lastPageBudget =
    PAGE_HEIGHT_PX - PAGE_VPAD_PX - TABLE_HEADER_PX - (lastPageIsFirst ? header : 0) - lastPageRowCount * ITEM_ROW_PX;
  const fullPageBudget = PAGE_HEIGHT_PX - PAGE_VPAD_PX;

  let footerJoinsLastPage: boolean;
  let skJoinsFooter: boolean; // true = same page as the footer, wherever that ends up
  let skOwnPage: boolean;

  if (footer + sk <= lastPageBudget) {
    // Everything fits alongside the item rows on the last page.
    footerJoinsLastPage = true;
    skJoinsFooter = true;
    skOwnPage = false;
  } else if (footer <= lastPageBudget) {
    // Footer fits with the rows, but S&K doesn't fit alongside it there.
    footerJoinsLastPage = true;
    skJoinsFooter = false;
    skOwnPage = sk > 0;
  } else if (footer + sk <= fullPageBudget) {
    // Footer needs its own page, and S&K fits alongside it on that page.
    footerJoinsLastPage = false;
    skJoinsFooter = true;
    skOwnPage = false;
  } else {
    // Footer alone fills (or nearly fills) a whole page — S&K gets its own.
    footerJoinsLastPage = false;
    skJoinsFooter = false;
    skOwnPage = sk > 0;
  }

  const totalPages = rowPages.length + (footerJoinsLastPage ? 0 : 1) + (skOwnPage ? 1 : 0);

  // Uses displayDiskon so a Flash Sale line's implied discount (Harga Rekomendasi − hargaJual) counts too.
  const totalDiskon = invoice.items.reduce((s, i) => s + displayDiskon(i) * i.qty, 0);
  // "Total Belanja" sums the Harga column (displayHarga). Total Belanja − Total Diskon always equals invoice.subtotalProduk (Diskon is Harga − the price charged
  // for every line), so grandTotal's math is unchanged.
  const totalBelanja = invoice.items.reduce((s, i) => s + displayHarga(i) * i.qty, 0);

  // Surat Jalan skips this block's price content (a delivery note has no prices); the closing logo/"Thank you" note stays, still ref-measured for the page-packing math.
  const totalsBlock = (
    <div ref={footerRef}>
      {mode !== "surat-jalan" && (
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
              {invoice.isPaid && (
                <div className="flex justify-between py-1.5 text-[0.88rem]">
                  <span>Pelunasan ({formatDateShort(invoice.paymentTanggalBayar ?? invoice.tanggal)})</span>
                  <span>− {rupiah(invoice.paymentNominalDiterima ?? invoice.grandTotal - invoice.dpNominal)}</span>
                </div>
              )}
              <div className="mt-1 flex justify-between border-t border-line pt-2 font-serif text-base font-semibold">
                <span>Sisa Tagihan</span>
                <span>{rupiah(invoice.isPaid ? 0 : invoice.grandTotal - invoice.dpNominal)}</span>
              </div>
            </>
          ) : null}
        </div>
      )}
      {invoice.catatan && (
        <div className="mt-5 border-t border-line pt-4 font-mono text-[0.8rem] leading-relaxed whitespace-pre-line">
          <div className="mb-1 text-[0.68rem] uppercase tracking-[0.1em] text-muted">Catatan</div>
          {invoice.catatan}
        </div>
      )}
      {/* Payment Details + closing logo/thank-you note side by side; Surat Jalan drops the Payment Details half (justify-end once only one side is left). */}
      <div
        className={`mt-9 flex flex-wrap items-start gap-6 border-t-2 border-ink pt-5 ${
          mode === "surat-jalan" ? "justify-end" : "justify-between"
        }`}
      >
        {mode !== "surat-jalan" && (
          <div className="font-mono text-[0.78rem] leading-relaxed">
            <div className="mb-1 text-[0.68rem] uppercase tracking-[0.1em] text-muted">Payment Details</div>
            <div>No. Rekening: 5771370277 (BCA)</div>
            <div>Atas Nama: Mohammad Andi Abdillah</div>
          </div>
        )}
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

  // Syarat & Ketentuan: free text from Pengaturan, one point per line as a numbered list (justified, generous line-height); on both Invoice and Surat Jalan.
  // Measured via its OWN ref (see skRef).
  const syaratKetentuanBlock =
    syaratKetentuanPoints.length > 0 ? (
      <div ref={skRef} className="border-t border-line pt-4">
        <div className="mb-2.5 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-muted">
          Syarat &amp; Ketentuan
        </div>
        {/* Nomor sebagai teks biasa, bukan list-decimal: html2canvas merender penanda <ol> naik/tidak sejajar dengan teks. */}
        <div className="space-y-1.5 font-mono text-[0.68rem] leading-[1.9] text-muted">
          {syaratKetentuanPoints.map((point, i) => (
            <div key={i} className="flex gap-2">
              <span className="w-4 shrink-0 text-right tabular-nums">{i + 1}.</span>
              <span className="min-w-0 flex-1 text-justify">{point}</span>
            </div>
          ))}
        </div>
      </div>
    ) : null;

  const headerBlock = (
    <div ref={headerRef}>
      <h2 className="mb-5 text-center font-serif text-2xl tracking-[0.08em]">
        {mode === "surat-jalan" ? "SURAT JALAN" : "INVOICE"}
      </h2>
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
        {/* Surat Jalan only: typed fresh at download time, never stored (InvoicePrintData.namaDriver). InvoiceActions' downloadSuratJalanPdf() patches the
            data-driver-slot element before html2canvas captures. */}
        {mode === "surat-jalan" && (
          <div>
            <div className="mb-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-muted">Nama Driver</div>
            <div className="font-mono text-[0.78rem] text-muted" data-driver-slot>
              {invoice.namaDriver ?? "—"}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const tableHeaders = mode === "surat-jalan" ? ["Produk", "Qty"] : [hasJasa ? "Item" : "Produk", "Qty", "Harga", "Diskon", "Subtotal"];

  return (
    <div className="h-0 overflow-hidden print:hidden">
      <div id={id} data-ready="true" className="font-sans text-ink">
        {rowPages.map((rows, pi) => {
          const isFirstPage = pi === 0;
          const isLastRowPage = pi === rowPages.length - 1;
          return (
            <div
              key={pi}
              data-print-page={pi}
              className="relative flex flex-col bg-panel"
              style={{ width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX, overflow: "hidden" }}
            >
              {/* Big diagonal translucent "LUNAS" watermark on EVERY page (a multi-page invoice can be viewed from any page); content stays readable underneath. */}
              {mode !== "surat-jalan" && invoice.isPaid && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                  <div
                    className="whitespace-nowrap font-serif font-semibold tracking-wide text-moss-deep"
                    style={{ transform: "rotate(-30deg)", fontSize: 150, opacity: 0.13 }}
                  >
                    LUNAS
                  </div>
                </div>
              )}
              <div className="p-9">
                {isFirstPage && headerBlock}
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {tableHeaders.map((h, idx) => (
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
                          {autoKapital(item.namaSnapshot)}
                          {item.dimensiSnapshot && (
                            <span className="ml-1.5 font-mono text-[0.72rem] text-muted">
                              ({item.dimensiSnapshot})
                            </span>
                          )}
                          {item.isFlashSale && (
                            <span className="ml-1.5 font-mono text-[0.72rem] font-semibold text-accent-700">
                              · Harga Special
                            </span>
                          )}
                          {item.isJasa && (
                            <span className="ml-1.5 font-mono text-[0.72rem] font-semibold text-accent-700">· Jasa</span>
                          )}
                        </td>
                        <td className="border-b border-line py-3 text-center text-[0.88rem]">{item.isJasa ? "–" : item.qty}</td>
                        {mode !== "surat-jalan" && (
                          <>
                            <td className="border-b border-line py-3 text-right text-[0.88rem]">{rupiah(displayHarga(item))}</td>
                            <td className="border-b border-line py-3 text-right text-[0.88rem]">{item.isJasa ? "–" : rupiah(displayDiskon(item))}</td>
                            <td className="border-b border-line py-3 text-right text-[0.88rem]">{rupiah(item.subtotal)}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {isLastRowPage && footerJoinsLastPage && (
                  <>
                    {totalsBlock}
                    {skJoinsFooter && syaratKetentuanBlock && <div className="mt-7">{syaratKetentuanBlock}</div>}
                  </>
                )}
              </div>
            </div>
          );
        })}
        {!footerJoinsLastPage && (
          <div
            data-print-page={rowPages.length}
            className="relative flex flex-col bg-panel"
            style={{ width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX, overflow: "hidden" }}
          >
            {mode !== "surat-jalan" && invoice.isPaid && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                <div
                  className="whitespace-nowrap font-serif font-semibold tracking-wide text-moss-deep"
                  style={{ transform: "rotate(-30deg)", fontSize: 150, opacity: 0.13 }}
                >
                  LUNAS
                </div>
              </div>
            )}
            <div className="p-9">
              {totalsBlock}
              {skJoinsFooter && syaratKetentuanBlock && <div className="mt-7">{syaratKetentuanBlock}</div>}
            </div>
          </div>
        )}
        {skOwnPage && (
          <div
            data-print-page={rowPages.length + (footerJoinsLastPage ? 0 : 1)}
            className="relative flex flex-col bg-panel"
            style={{ width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX, overflow: "hidden" }}
          >
            {mode !== "surat-jalan" && invoice.isPaid && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                <div
                  className="whitespace-nowrap font-serif font-semibold tracking-wide text-moss-deep"
                  style={{ transform: "rotate(-30deg)", fontSize: 150, opacity: 0.13 }}
                >
                  LUNAS
                </div>
              </div>
            )}
            <div className="p-9">{syaratKetentuanBlock}</div>
          </div>
        )}
      </div>
      {/* totalPages isn't rendered anywhere; kept for a possible "Halaman X dari Y" footer. */}
      <span className="hidden" data-total-pages={totalPages} />
    </div>
  );
}
