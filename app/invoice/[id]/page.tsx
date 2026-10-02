import { notFound } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import InvoiceActions from "@/components/invoice/InvoiceActions";
import InvoiceMoreActions from "@/components/invoice/InvoiceMoreActions";
import InvoicePrintDoc, { type InvoicePrintData } from "@/components/invoice/InvoicePrintDoc";
import InvoiceDocument from "@/components/invoice/InvoiceDocument";
import DeleteInvoiceButton from "@/components/invoice/DeleteInvoiceButton";
import TandaiKirimButton from "@/components/invoice/TandaiKirimButton";
import { LinkButton } from "@/components/ui/Button";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Sales } from "@/models/Sales";
import { Courier } from "@/models/Courier";
import { Pengaturan } from "@/models/Pengaturan";
import { rupiah, formatDateLong, formatDateShort } from "@/lib/format";
import { getSession } from "@/lib/auth/session";
import { isInvoiceBlockedForSession } from "@/lib/invoice-visibility";

export const dynamic = "force-dynamic";

const MENU_ITEM_CLS = "block px-6 py-2.5 font-sans text-[0.82rem] font-semibold text-ink no-underline hover:bg-surface";

export default async function InvoiceDetailPage({ params }: PageProps<"/invoice/[id]">) {
  const { id } = await params;
  await dbConnect();
  const invoice = await Invoice.findById(id);
  if (!invoice) notFound();
  // Per-sales invoice privacy — per the user's request 2026-08-29. Same
  // pattern as Pelanggan's own per-sales guard.
  const session = await getSession();
  if (isInvoiceBlockedForSession(session, invoice.sales?.nama)) notFound();

  const couriers = (await Courier.find().sort({ name: 1 }).lean()).map((c) => ({ _id: String(c._id), name: c.name }));

  // Feeds the Syarat & Ketentuan block — see models/Pengaturan.ts's
  // syaratKetentuan doc comment.
  const pengaturan = await Pengaturan.findById("singleton").lean();

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
    catatan: invoice.catatan ?? undefined,
    syaratKetentuan: pengaturan?.syaratKetentuan ?? undefined,
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
      hargaRekomendasiSnapshot: item.hargaRekomendasiSnapshot ?? undefined,
    })),
    subtotalProduk: invoice.subtotalProduk,
    ongkosKirim: invoice.ongkosKirim ?? 0,
    grandTotal: invoice.grandTotal,
    dpNominal: invoice.dp?.nominal ?? undefined,
    dpTanggal: invoice.dp?.tanggal ? invoice.dp.tanggal.toISOString() : undefined,
    isPaid: invoice.status === "paid",
    paymentTanggalBayar: invoice.payment?.tanggalBayar ? invoice.payment.tanggalBayar.toISOString() : undefined,
    paymentNominalDiterima: invoice.payment?.nominalDiterima ?? undefined,
  };

  // Riwayat card = the invoice's own stored events plus, once its commission
  // has been paid out to the sales rep, one more line with that date —
  // derived from komisiCair/komisiCairTanggal at render time rather than
  // pushed into `riwayat` by the payout routes, so it also covers invoices
  // paid out before this existed (no backfill needed) and drops off by
  // itself if a payout is ever reversed (/api/invoices/[id]/payout). Appended
  // last (not sorted in) so the existing entries' order is untouched — a
  // payout can only happen after the invoice is lunas. Per the
  // user's request 2026-10-01 ("tampilkan juga kapan invoice ini
  // dibayarkan insentifnya"). Not part of printData, so it never reaches the
  // customer-facing PDF.
  const riwayatRows = [
    ...invoice.riwayat.map((r) => ({
      tanggal: r.tanggal ?? invoice.createdAt!,
      keterangan: r.keterangan,
    })),
    ...(invoice.komisiCair && invoice.komisiCairTanggal
      ? [{ tanggal: invoice.komisiCairTanggal, keterangan: `Komisi dibayarkan ke ${invoice.sales?.nama ?? "sales"}` }]
      : []),
  ];

  // Visibility rules unchanged from before the TASK-039 redesign: Ubah/Hapus
  // hidden once lunas, Hapus hidden once a DP exists, Catat DP only when
  // unpaid with no DP. A draft's "Ubah" is the main "Lanjutkan Edit" button.
  const isDraft = invoice.status === "draft";
  const isPaid = invoice.status === "paid";
  const dpNominal = invoice.dp?.nominal ?? 0;
  const allDone = isPaid && !!invoice.dikirim;
  const canCatatDp = invoice.status === "unpaid" && !dpNominal;
  const canUbah = !isPaid && !isDraft;
  const canHapus = !isPaid && !dpNominal;
  const morePeek = ["Surat Jalan", ...(canCatatDp ? ["Catat DP"] : []), ...(canUbah ? ["Ubah"] : []), ...(canHapus ? ["Hapus"] : [])];

  return (
    <>
      <InvoicePrintDoc invoice={printData} id="invoice-print-doc" />
      {/* Surat Jalan — TASK-018 (2026-09-07), a second hidden instance
          (own id, mode="surat-jalan") so it's independently downloadable
          from "Unduh Invoice (PDF)" without re-rendering between clicks.
          namaDriver is deliberately left unset here — it's typed fresh
          into a prompt() at download time (InvoiceActions.tsx), never
          stored (see InvoicePrintData.namaDriver's own doc comment). */}
      <InvoicePrintDoc invoice={printData} mode="surat-jalan" id="surat-jalan-print-doc" />
      {/* App chrome (title/subtitle/action buttons) has no place on the
          actual printed document — #invoice-doc below is the on-screen
          preview; InvoicePrintDoc above is the hidden layout that's
          actually downloaded. Per the user's request 2026-08-26/27. */}
      <div className="no-print">
      <PageHeader
        title={invoice.nomor}
        subtitle={`DIBUAT ${formatDateLong(invoice.tanggalInvoice ?? invoice.createdAt!).toUpperCase()}`}
      />
      </div>
      <div className="p-6 md:p-9">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
          {/* WA + Unduh Invoice icons ride the document's top-right corner —
              approved mockup 2026-10-02 (TASK-039, invoice-detail-v7.html).
              no-print so they never appear in a browser print of the page. */}
          <div className="relative order-2 min-w-0 lg:order-1">
            <div className="no-print absolute top-3 right-3 z-10">
              <InvoiceActions
                part="icons"
                nomor={invoice.nomor}
                customerNama={invoice.customer!.nama}
                customerWhatsapp={invoice.customer!.whatsapp ?? undefined}
                grandTotal={invoice.grandTotal}
              />
            </div>
            <InvoiceDocument invoice={printData} id="invoice-doc" />
          </div>

          <div className="no-print order-1 lg:order-2">
            {/* ONE main card instead of three (TASK-039): total + status pills,
                the next lifecycle step(s) as buttons (max 2: pembayaran,
                pengiriman), and everything else behind "Aksi lainnya". */}
            <div className="mb-3.5 rounded-2xl bg-panel p-6 shadow-sm">
              <div className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">Total Invoice</div>
              <div className="mt-0.5 font-sans text-[1.75rem] font-extrabold tracking-tight tabular-nums">
                {rupiah(invoice.grandTotal)}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span
                  className={`rounded-full border px-2.5 py-[3px] font-mono text-[11px] font-bold ${
                    isPaid
                      ? "border-ink text-ink"
                      : isDraft
                        ? "border-line text-muted"
                        : dpNominal
                          ? "border-gold bg-accent-100 text-accent-700"
                          : "border-accent-700 text-accent-700"
                  }`}
                >
                  {isDraft
                    ? "Draft"
                    : isPaid
                      ? "Lunas"
                      : dpNominal
                        ? `Sudah DP ${Math.round((dpNominal / invoice.grandTotal) * 100)}%`
                        : "Belum Dibayar"}
                </span>
                {!isDraft &&
                  (invoice.dikirim ? (
                    <span className="rounded-full border border-emerald-500 bg-emerald-50 px-2.5 py-[3px] font-mono text-[11px] font-bold text-emerald-700">
                      ✓ Sudah dikirim · {formatDateShort(invoice.tanggalDikirimAktual ?? invoice.createdAt!)}
                      {invoice.dikirimOleh ? ` · ${invoice.dikirimOleh}` : ""}
                    </span>
                  ) : (
                    <span className="rounded-full border border-line px-2.5 py-[3px] font-mono text-[11px] font-bold text-muted">
                      Belum dikirim
                    </span>
                  ))}
              </div>
              {dpNominal && !isPaid ? (
                <div className="mt-3.5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 font-mono text-[0.8rem] tabular-nums">
                  <span className="text-muted">DP diterima ({formatDateShort(invoice.dp!.tanggal ?? invoice.createdAt!)})</span>
                  <span className="text-right font-bold">{rupiah(dpNominal)}</span>
                  <span className="text-muted">Sisa tagihan</span>
                  <span className="text-right font-bold text-accent-700">{rupiah(invoice.grandTotal - dpNominal)}</span>
                </div>
              ) : null}
              {isDraft && (
                <div className="mt-3.5 font-mono text-[0.72rem] text-muted">
                  Invoice draft belum mengurangi stok atau menghitung komisi.
                </div>
              )}

              {/* Next steps. Payment and shipping are independent (an invoice can
                  ship before it is paid), so each pending step keeps its own button. */}
              <div className="mt-5.5 border-t border-line pt-5.5">
                {allDone && (
                  <div className="flex items-center gap-2 font-sans text-[0.85rem] font-bold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Semua langkah selesai
                  </div>
                )}
                {isDraft && (
                  <LinkButton href={`/invoice/${invoice._id}/ubah`} className="w-full">
                    Lanjutkan Edit
                  </LinkButton>
                )}
                {invoice.status === "unpaid" && (
                  <div>
                    <div className="mb-1.5 font-sans text-[0.75rem] font-semibold text-muted">Pembayaran</div>
                    <LinkButton href={`/invoice/${invoice._id}/bayar`} className="w-full">
                      Tandai Lunas
                    </LinkButton>
                  </div>
                )}
                {!isDraft && !invoice.dikirim && (
                  <div className={invoice.status === "unpaid" ? "mt-3.5" : ""}>
                    <div className="mb-1.5 font-sans text-[0.75rem] font-semibold text-muted">Pengiriman</div>
                    <TandaiKirimButton
                      invoiceId={String(invoice._id)}
                      nomor={invoice.nomor}
                      customerNama={invoice.customer?.nama}
                      couriers={couriers}
                      currentKurir={invoice.kurir ?? undefined}
                      className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-ink bg-ink px-4.5 py-2.5 font-sans text-[0.85rem] font-extrabold text-accent transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                )}
              </div>

              <InvoiceMoreActions peek={morePeek.join(" · ")}>
                <div className="px-6 pt-2.5 pb-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                  Dokumen
                </div>
                <InvoiceActions
                  part="suratJalan"
                  nomor={invoice.nomor}
                  customerNama={invoice.customer!.nama}
                  customerWhatsapp={invoice.customer!.whatsapp ?? undefined}
                  grandTotal={invoice.grandTotal}
                />
                {canCatatDp && (
                  <>
                    <div className="px-6 pt-2.5 pb-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                      Pembayaran
                    </div>
                    <Link href={`/invoice/${invoice._id}/dp`} className={MENU_ITEM_CLS}>
                      Catat DP
                    </Link>
                  </>
                )}
                {(canUbah || canHapus) && (
                  <>
                    <div className="px-6 pt-2.5 pb-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                      Kelola
                    </div>
                    {canUbah && (
                      <Link href={`/invoice/${invoice._id}/ubah`} className={MENU_ITEM_CLS}>
                        Ubah Invoice
                      </Link>
                    )}
                    {canHapus && (
                      <DeleteInvoiceButton
                        invoiceId={String(invoice._id)}
                        nomor={invoice.nomor}
                        redirectTo="/invoice"
                        className="block w-full cursor-pointer px-6 py-2.5 text-left font-sans text-[0.82rem] font-semibold text-danger hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    )}
                  </>
                )}
              </InvoiceMoreActions>
            </div>
            <div className="rounded-2xl bg-panel p-5 shadow-sm">
              <h3 className="mb-3 font-mono text-[0.7rem] uppercase tracking-wide text-muted">Riwayat</h3>
              <div className="font-mono text-[0.75rem] leading-loose text-muted">
                {riwayatRows.map((r, idx) => (
                  <div key={idx}>
                    {formatDateShort(r.tanggal)} — {r.keterangan}
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
