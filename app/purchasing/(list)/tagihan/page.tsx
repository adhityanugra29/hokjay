import Link from "next/link";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import { RowActionLink } from "@/components/ui/RowAction";
import Pill from "@/components/ui/Pill";
import { dbConnect } from "@/lib/db";
import { PurchaseBill } from "@/models/PurchaseBill";
import { rupiah, formatDateShort } from "@/lib/format";
import Pagination from "@/components/ui/Pagination";
import { parsePage, clampPageOrRedirect } from "@/lib/pagination";

export const dynamic = "force-dynamic";

/** "Material Order" (renamed from "Tagihan Pembelian" 2026-08-23). Model stays PurchaseBill internally. */
export default async function PurchasingTagihanPage({ searchParams }: PageProps<"/purchasing/tagihan">) {
  const sp = await searchParams;
  const { page, pageSize, skip } = parsePage(sp);
  await dbConnect();
  const [bills, total] = await Promise.all([
    PurchaseBill.find().sort({ createdAt: -1, _id: -1 }).skip(skip).limit(pageSize).lean(),
    PurchaseBill.countDocuments(),
  ]);
  clampPageOrRedirect("/purchasing/tagihan", sp, page, total, pageSize);

  return (
    <Panel>
      <PanelHead title="Semua Material Order" />
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
                Total
              </th>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Tanggal Dibuat
              </th>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Status
              </th>
              <th className="border-b border-line px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {bills.map((b) => (
              <tr key={String(b._id)} className="hover:bg-[#fbfaf5]">
                <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{b.nomor}</td>
                <td className="border-b border-line px-5 py-4.5 font-medium">
                  {b.namaBarang}
                  <div className="font-mono text-[0.7rem] text-muted">{b.qty} unit</div>
                </td>
                <td className="border-b border-line px-5 py-4.5 font-mono text-[0.78rem] text-muted">{b.supplier}</td>
                <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem] font-medium text-accent-700">
                  {rupiah(b.totalTagihan)}
                </td>
                <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                  {formatDateShort(b.createdAt!)}
                </td>
                <td className="border-b border-line px-5 py-4.5">
                  <Pill variant={b.status === "dibayar" ? "paid" : "unpaid"}>
                    {b.status === "dibayar" ? "Sudah Dibayar" : "Belum Dibayar"}
                  </Pill>
                </td>
                <td className="border-b border-line px-5 py-4.5">
                  {!b.dicatatSebagaiAset && (
                    <RowActionLink href={`/inventaris-kantor?billId=${b._id}`}>Catat sebagai Aset</RowActionLink>
                  )}
                </td>
              </tr>
            ))}
            {bills.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center font-mono text-sm text-muted">
                  Belum ada Material Order.{" "}
                  <Link href="/purchasing/tagihan/baru" className="text-accent-700 underline underline-offset-2">
                    Buat yang pertama
                  </Link>
                  .
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>
      <Pagination basePath="/purchasing/tagihan" searchParams={sp} page={page} pageSize={pageSize} total={total} />
    </Panel>
  );
}
