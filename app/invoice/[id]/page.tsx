import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import InvoiceActions from "@/components/invoice/InvoiceActions";
import DeleteInvoiceButton from "@/components/invoice/DeleteInvoiceButton";
import { LinkButton } from "@/components/ui/Button";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { rupiah, formatDateLong, formatDateShort } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: PageProps<"/invoice/[id]">) {
  const { id } = await params;
  await dbConnect();
  const invoice = await Invoice.findById(id);
  if (!invoice) notFound();

  return (
    <>
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
      <div className="p-6 md:p-9">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
          <div id="invoice-doc" className="border border-line bg-panel p-9">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b-2 border-ink pb-6">
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo/hojay-2b-positif.png" alt="HOJAY Kitchen Equipment" width={110} height={61} className="mb-2 h-auto w-[110px]" />
                <h2 className="font-serif text-2xl">INVOICE</h2>
              </div>
              <div className="text-right font-mono text-[0.75rem] leading-relaxed text-muted">
                No. {invoice.nomor}
                <br />
                Tanggal: {formatDateShort(invoice.tanggalInvoice ?? invoice.createdAt!)}
              </div>
            </div>

            <div className="mb-7 flex flex-wrap gap-9">
              <div>
                <div className="mb-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-muted">
                  Ditagihkan kepada
                </div>
                <div className="font-medium">{invoice.customer!.nama}</div>
                <div className="mt-1 font-mono text-[0.78rem] text-muted">{invoice.customer!.whatsapp}</div>
              </div>
              <div>
                <div className="mb-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-muted">Dikirim ke</div>
                <div className="text-[0.9rem] font-medium">{invoice.shipAddress ?? "—"}</div>
                <div className="mt-1 font-mono text-[0.78rem] text-muted">
                  {invoice.tanggalKirim ? `Tgl. Kirim: ${formatDateShort(invoice.tanggalKirim)}` : ""}
                  {invoice.kurir ? ` · ${invoice.kurir}` : ""}
                </div>
              </div>
              <div>
                <div className="mb-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-muted">Sales</div>
                <div className="font-medium">{invoice.sales!.nama}</div>
              </div>
            </div>

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
                {invoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border-b border-line py-3 text-[0.88rem]">{item.namaSnapshot}</td>
                    <td className="border-b border-line py-3 text-center text-[0.88rem]">{item.qty}</td>
                    <td className="border-b border-line py-3 text-right text-[0.88rem]">{rupiah(item.hargaJual)}</td>
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
