import { notFound } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import Pill from "@/components/ui/Pill";
import TerimaPOButton from "@/components/purchasing/TerimaPOButton";
import { dbConnect } from "@/lib/db";
import { PurchaseOrder } from "@/models/PurchaseOrder";
import { PurchaseBill } from "@/models/PurchaseBill";
import { rupiah, formatDateShort } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PurchaseOrderDetailPage({ params }: PageProps<"/purchasing/po/[id]">) {
  const { id } = await params;
  await dbConnect();

  const po = await PurchaseOrder.findById(id).lean();
  if (!po) notFound();

  const bills = po.bills?.length ? await PurchaseBill.find({ _id: { $in: po.bills } }).lean() : [];

  const isMenunggu = po.status === "menunggu";
  const hariTelat =
    isMenunggu && po.tanggalEstimasi && po.tanggalEstimasi.getTime() < Date.now()
      ? Math.floor((Date.now() - po.tanggalEstimasi.getTime()) / 86_400_000)
      : 0;

  return (
    <>
      <PageHeader
        title={po.nomor}
        subtitle={`SUPPLIER ${po.supplier.toUpperCase()}`}
        actions={isMenunggu ? <TerimaPOButton poId={String(po._id)} /> : undefined}
      />
      <div className="grid grid-cols-1 gap-5 p-6 md:p-9 lg:grid-cols-[1fr_320px]">
        <div>
          <Panel className="mb-5">
            <PanelHead title="Barang Dipesan" />
            <TableScroll>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                      Barang
                    </th>
                    <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                      Qty
                    </th>
                    <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                      Harga Satuan
                    </th>
                    <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {po.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="border-b border-line px-5 py-4.5 font-medium">{item.namaSnapshot}</td>
                      <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{item.qty}</td>
                      <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                        {rupiah(item.hargaSatuan)}
                      </td>
                      <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem] font-medium text-accent-700">
                        {rupiah(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="border-t-2 border-ink px-5 py-4 text-right font-bold">
                      Total Nilai PO
                    </td>
                    <td className="border-t-2 border-ink px-5 py-4 font-mono font-bold text-accent-700">
                      {rupiah(po.totalNilai)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </TableScroll>
          </Panel>

          {bills.length > 0 && (
            <Panel>
              <PanelHead title="Material Order dari PO ini" />
              <TableScroll>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                        Nomor
                      </th>
                      <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                        Barang
                      </th>
                      <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                        Total
                      </th>
                      <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((b) => (
                      <tr key={String(b._id)}>
                        <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                          <Link href="/purchasing/tagihan" className="text-accent-700 underline underline-offset-2">
                            {b.nomor}
                          </Link>
                        </td>
                        <td className="border-b border-line px-5 py-4.5">{b.namaBarang}</td>
                        <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                          {rupiah(b.totalTagihan)}
                        </td>
                        <td className="border-b border-line px-5 py-4.5">
                          <Pill variant={b.status === "dibayar" ? "paid" : "unpaid"}>
                            {b.status === "dibayar" ? "Sudah Dibayar" : "Belum Dibayar"}
                          </Pill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            </Panel>
          )}
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="border border-line bg-panel p-4.5">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Status</div>
            <div className="mt-1.5">
              {po.status === "menunggu" && (
                <Pill variant={hariTelat > 0 ? "unpaid" : "draft"}>
                  {hariTelat > 0 ? `Telat ${hariTelat} hari` : "Menunggu Barang"}
                </Pill>
              )}
              {po.status === "diterima" && <Pill variant="paid">Diterima</Pill>}
              {po.status === "dibatalkan" && <Pill variant="out">Dibatalkan</Pill>}
            </div>
          </div>
          <div className="border border-line bg-panel p-4.5 font-mono text-[0.78rem] text-muted">
            <div>Tanggal pesan: {formatDateShort(po.tanggalPesan ?? po.createdAt!)}</div>
            {po.tanggalEstimasi && <div className="mt-1.5">ETA: {formatDateShort(po.tanggalEstimasi)}</div>}
            {po.tanggalDiterima && <div className="mt-1.5">Diterima: {formatDateShort(po.tanggalDiterima)}</div>}
          </div>
          {po.supplierBank && (
            <div className="border border-line bg-panel p-4.5">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                Transfer ke
              </div>
              <div className="mt-1.5 font-sans text-[0.9rem] font-bold">
                {po.supplierBank} — {po.supplierNomorRekening}
              </div>
              {po.supplierAlamat && <div className="mt-1 font-mono text-[0.72rem] text-muted">{po.supplierAlamat}</div>}
            </div>
          )}
          {po.catatan && (
            <div className="border border-line bg-panel p-4.5">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                Catatan
              </div>
              <div className="mt-1.5 font-sans text-[0.85rem]">{po.catatan}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
