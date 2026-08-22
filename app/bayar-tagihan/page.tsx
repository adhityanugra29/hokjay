import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import { RowActionLink } from "@/components/ui/RowAction";
import { dbConnect } from "@/lib/db";
import { PurchaseBill } from "@/models/PurchaseBill";
import { rupiah, formatDateShort } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Standalone landing page for Finance (own nav item, same pattern as
 * /bayar-komisi): tagihan pembelian Purchasing sudah buat tapi belum
 * dibayar. See /bayar-tagihan/[id] for the actual payment form.
 */
export default async function BayarTagihanPage() {
  await dbConnect();
  const bills = await PurchaseBill.find({ status: "belum_dibayar" }).sort({ jatuhTempo: 1, createdAt: 1 }).lean();
  const totalOutstanding = bills.reduce((s, b) => s + b.totalTagihan, 0);

  return (
    <>
      <PageHeader title="Pembayaran Tagihan Purchasing" subtitle="UNTUK TIM FINANCE · BAYAR TAGIHAN DARI TIM PURCHASING" />
      <div className="p-6 md:p-9">
        <div className="mb-5 border border-line bg-[#f7f5ee] p-5">
          <div className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">
            Total tagihan belum dibayar
          </div>
          <div className="mt-1 text-[1.6rem] font-extrabold text-accent-700">{rupiah(totalOutstanding)}</div>
        </div>

        <Panel>
          <PanelHead title="Tagihan pembelian belum dibayar" />
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
                    Supplier
                  </th>
                  <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                    Transfer Ke
                  </th>
                  <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                    Jatuh Tempo
                  </th>
                  <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                    Total Tagihan
                  </th>
                  <th className="border-b border-line px-5 py-4" />
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={String(b._id)} className="hover:bg-[#fbfaf5]">
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{b.nomor}</td>
                    <td className="border-b border-line px-5 py-4.5 font-medium">{b.namaBarang}</td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.78rem] text-muted">{b.supplier}</td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.75rem]">
                      {b.supplierBank ? (
                        <>
                          {b.supplierBank} — {b.supplierNomorRekening}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                      {b.jatuhTempo ? formatDateShort(b.jatuhTempo) : "—"}
                    </td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem] font-medium text-accent-700">
                      {rupiah(b.totalTagihan)}
                    </td>
                    <td className="border-b border-line px-5 py-4.5">
                      <RowActionLink href={`/bayar-tagihan/${b._id}`}>Bayar →</RowActionLink>
                    </td>
                  </tr>
                ))}
                {bills.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center font-mono text-sm text-muted">
                      Semua tagihan sudah dibayar. 🎉
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableScroll>
        </Panel>

        <div className="mt-3 font-mono text-[0.72rem] text-muted">
          Lihat semua tagihan (termasuk yang sudah dibayar) di{" "}
          <Link href="/purchasing/tagihan" className="text-accent underline underline-offset-2">
            Purchasing → Tagihan Pembelian
          </Link>
          .
        </div>
      </div>
    </>
  );
}
