import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import InvoiceActions from "@/components/invoice/InvoiceActions";
import InvoicePrintDoc, { type InvoicePrintData } from "@/components/invoice/InvoicePrintDoc";
import DeleteInvoiceButton from "@/components/invoice/DeleteInvoiceButton";
import { LinkButton } from "@/components/ui/Button";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Sales } from "@/models/Sales";
import { rupiah, formatDateLong, formatDateShort } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: PageProps<"/invoice/[id]">) {
  const { id } = await params;
  await dbConnect();
  const invoice = await Invoice.findById(id);
  if (!invoice) notFound();

  // Live lookup rather than a snapshot on the invoice itself — a phone
  // number changing should show up on invoices printed afterward, unlike
  // hargaMinimumSnapshot etc. which deliberately freeze at booking time.
  // Per the user's request 2026-08-28.
  const salesDoc = invoice.sales?.ref ? await Sales.findById(invoice.sales.ref).lean() : null;
  const salesNomorHp = salesDoc?.nomorHp ?? undefined;

  // Feeds InvoicePrintDoc — the hidden, multi-page layout InvoiceActions'
  // "Unduh Invoice (PDF)" button actually captures (html2canvas + jsPDF,
  // same approach as the Katalog PDF). Replaces native window.print() per
  // the user's report 2026-08-27 that a long invoice's content got cut off
  // — #invoice-doc below sat inside a CSS grid, a well-known source of
  // print-pagination bugs across browsers. The visible #invoice-doc stays
  // as the on-screen preview; it's no longer what actually gets exported.
  const printData: InvoicePrintData = {
    nomor: invoice.nomor,
    tanggal: (invoice.tanggalInvoice ?? invoice.createdAt!).toISOString(),
    customerNama: invoice.customer!.nama,
    customerWhatsapp: invoice.customer!.whatsapp ?? undefined,
    shipAddress: invoice.shipAddress ?? undefined,
    tanggalKirim: invoice.tanggalKirim ? invoice.tanggalKirim.toISOString() : undefined,
    kurir: invoice.kurir ?? undefined,
    salesNama: invoice.sales!.nama,
    salesNomorHp,
    items: invoice.items.map((item) => ({
      namaSnapshot: item.namaSnapshot,
      dimensiSnapshot: item.dimensiSnapshot ?? undefined,
      qty: item.qty,
      hargaJual: item.hargaJual,
      diskonPerUnit: item.diskonPerUnit ?? 0,
      subtotal: item.subtotal,
      isFlashSale: item.isFlashSale ?? false,
    })),
    subtotalProduk: invoice.subtotalProduk,
    ongkosKirim: invoice.ongkosKirim ?? 0,
    grandTotal: invoice.grandTotal,
    dpNominal: invoice.dp?.nominal ?? undefined,
    dpTanggal: invoice.dp?.tanggal ? invoice.dp.tanggal.toISOString() : undefined,
  };

  return (
    <>
      <InvoicePrintDoc invoice={printData} />
      {/* App chrome (title/subtitle/action buttons) has no place on the
          actual printed document — #invoice-doc below is the on-screen
          preview; InvoicePrintDoc above is the hidden layout that's
          actually downloaded. Per the user's request 2026-08-26/27. */}
      <div className="no-print">
      <PageHeader
        title={invoice.nomor}
        subtitle={`DIBUAT ${formatDateLong(invoice.tanggalInvoice ?? invoice.createdAt!).toUpperCase()}`}
        actions={
          <>
            {invoice.status !== "paid" && (
              <LinkButton variant="ghost" href={`/invoice/${invoice._id}/ubah`}>
                Ubah Invoice
              </LinkButton>
            )}
            {invoice.status !== "paid" && !invoice.dp?.nominal && (
              <DeleteInvoiceButton
                invoiceId={String(invoice._id)}
                nomor={invoice.nomor}
                redirectTo="/invoice"
                className="inline-flex items-center justify-center gap-2 rounded border border-line bg-transparent px-4.5 py-2.5 font-sans text-[0.85rem] font-extrabold text-danger transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
              />
            )}
            <InvoiceActions
              nomor={invoice.nomor}
              customerNama={invoice.customer!.nama}
              customerWhatsapp={invoice.customer!.whatsapp ?? undefined}
              grandTotal={invoice.grandTotal}
            />
          </>
        }
      />
      </div>
      <div className="p-6 md:p-9">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
          <div id="invoice-doc" className="border border-line bg-panel p-9">
            {/* "INVOICE" centered above a logo+company-info / no.+tanggal
                row — per the user's request 2026-08-25. */}
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
                Tanggal: {formatDateLong(invoice.tanggalInvoice ?? invoice.createdAt!)}
                {/* Sales moved up here, level with the CV. Horeca Jaya
                    block on the left, right below Tanggal — was down in
                    the 3-column row below. Per the user's request
                    2026-08-27. */}
                <div className="mt-2 border-t border-line pt-2">
                  Sales Consultant: {invoice.sales!.nama}
                  {salesNomorHp && (
                    <>
                      <br />
                      {salesNomorHp}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 3 columns, wider gap between them. Per the user's request
                2026-08-27 ("terlalu mepet"). */}
            <div className="mb-7 flex flex-wrap items-start gap-x-12 gap-y-5">
              <div>
                <div className="mb-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-muted">
                  Ditagihkan kepada
                </div>
                <div className="font-medium">{invoice.customer!.nama}</div>
                <div className="mt-1 font-mono text-[0.78rem] text-muted">{invoice.customer!.whatsapp}</div>
              </div>
              <div>
                <div className="mb-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-muted">
                  Alamat Pengiriman
                </div>
                <div className="text-[0.9rem] font-medium">{invoice.shipAddress ?? "—"}</div>
              </div>
              <div>
                <div className="mb-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-muted">
                  Tanggal Pengiriman
                </div>
                <div className="font-mono text-[0.78rem] text-muted">
                  {invoice.tanggalKirim ? formatDateShort(invoice.tanggalKirim) : "—"}
                  {invoice.kurir ? ` · ${invoice.kurir}` : ""}
                </div>
              </div>
            </div>

            <table className="w-full border-collapse">
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
                        <span className="ml-1.5 font-mono text-[0.72rem] font-semibold text-accent-700">
                          · Harga Special
                        </span>
                      )}
                    </td>
                    <td className="border-b border-line py-3 text-center text-[0.88rem]">{item.qty}</td>
                    <td className="border-b border-line py-3 text-right text-[0.88rem]">{rupiah(item.hargaJual)}</td>
                    <td className="border-b border-line py-3 text-right text-[0.88rem]">{rupiah(item.diskonPerUnit)}</td>
                    <td className="border-b border-line py-3 text-right text-[0.88rem]">{rupiah(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="ml-auto mt-5 w-full max-w-[260px] font-mono">
              <div className="flex justify-between py-1.5 text-[0.88rem]">
                <span>Subtotal Produk</span>
                <span>{rupiah(invoice.subtotalProduk)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-[0.88rem]">
                <span>Ongkos Kirim</span>
                <span>{rupiah(invoice.ongkosKirim ?? 0)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t-2 border-ink pt-3 font-serif text-lg font-semibold">
                <span>Total</span>
                <span>{rupiah(invoice.grandTotal)}</span>
              </div>
              {invoice.dp?.nominal ? (
                <>
                  <div className="flex justify-between py-1.5 text-[0.88rem]">
                    <span>DP ({formatDateShort(invoice.dp.tanggal ?? invoice.createdAt!)})</span>
                    <span>− {rupiah(invoice.dp.nominal)}</span>
                  </div>
                  <div className="mt-1 flex justify-between border-t border-line pt-2 font-serif text-base font-semibold">
                    <span>Sisa Tagihan</span>
                    <span>{rupiah(invoice.grandTotal - invoice.dp.nominal)}</span>
                  </div>
                </>
              ) : null}
            </div>

            {/* Payment details footnote — a single element placed once at
                the very end of the document (not repeated per page like
                the Katalog PDF's footer — this uses native browser print
                pagination, not the Katalog's manual per-page chunking), so
                it only ever shows up on whichever page the content
                naturally ends on. break-inside-avoid keeps it from being
                split across a page boundary if it lands right at one. Per
                the user's request 2026-08-25/26. */}
            {/* Payment Details + closing logo/thank-you note side by side,
                same row — per the user's request 2026-08-27 (was stacked
                below before). Translated from the user's own Indonesian
                wording ("Terimakasih sudah mempercayakan Peralatan dapur
                anda kepada kami") rather than the earlier English attempt,
                which read backwards. */}
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
                {/* Sales name + phone repeated here at the very close of
                    the document — per the user's request 2026-08-28. */}
                <div className="mt-1 font-mono text-[0.72rem] leading-relaxed text-muted">
                  {invoice.sales!.nama}
                  {salesNomorHp && (
                    <>
                      <br />
                      {salesNomorHp}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="no-print">
            <div className="mb-3.5 border border-line bg-panel p-5">
              <h3 className="mb-3 font-mono text-[0.7rem] uppercase tracking-wide text-muted">Status Pembayaran</h3>
              <div className="flex items-center gap-2 font-mono text-[0.8rem]">
                <span
                  className={`h-2 w-2 rounded-full ${invoice.status === "paid" ? "bg-moss" : "bg-gold"}`}
                />
                {invoice.status === "draft" && "Draft — belum dikirim"}
                {invoice.status === "unpaid" &&
                  (invoice.dp?.nominal
                    ? `Sudah DP ${Math.round((invoice.dp.nominal / invoice.grandTotal) * 100)}%`
                    : "Belum Dibayar")}
                {invoice.status === "paid" && "Lunas"}
              </div>
              {invoice.dp?.nominal ? (
                <div className="mt-3.5 border-l-4 border-accent bg-[#f7f5ee] py-2 pl-3 font-mono text-[0.75rem] leading-relaxed">
                  DP diterima <b>{rupiah(invoice.dp.nominal)}</b> ({formatDateShort(invoice.dp.tanggal ?? invoice.createdAt!)})
                  <br />
                  Sisa tagihan <b className="text-accent-700">{rupiah(invoice.grandTotal - invoice.dp.nominal)}</b>
                </div>
              ) : null}
              {invoice.status === "unpaid" && (
                <div className="mt-3.5 flex flex-col gap-2">
                  <LinkButton href={`/invoice/${invoice._id}/bayar`} className="w-full">
                    Tandai Lunas Manual
                  </LinkButton>
                  {!invoice.dp?.nominal && (
                    <LinkButton variant="ghost" href={`/invoice/${invoice._id}/dp`} className="w-full">
                      Catat DP
                    </LinkButton>
                  )}
                </div>
              )}
              {invoice.status === "draft" && (
                <div className="mt-3.5 font-mono text-[0.72rem] text-muted">
                  Invoice draft belum mengurangi stok atau menghitung komisi.
                </div>
              )}
            </div>
            <div className="border border-line bg-panel p-5">
              <h3 className="mb-3 font-mono text-[0.7rem] uppercase tracking-wide text-muted">Riwayat</h3>
              <div className="font-mono text-[0.75rem] leading-loose text-muted">
                {invoice.riwayat.map((r, idx) => (
                  <div key={idx}>
                    {formatDateShort(r.tanggal ?? invoice.createdAt!)} — {r.keterangan}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
