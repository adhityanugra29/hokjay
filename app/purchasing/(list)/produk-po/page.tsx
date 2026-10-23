import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import { RowActionLink } from "@/components/ui/RowAction";
import Pill, { type PillVariant } from "@/components/ui/Pill";
import { dbConnect } from "@/lib/db";
import { PurchaseRequest } from "@/models/PurchaseRequest";
import { formatDateShort } from "@/lib/format";
import Pagination from "@/components/ui/Pagination";
import { parsePage, clampPageOrRedirect } from "@/lib/pagination";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; variant: PillVariant }> = {
  diajukan: { label: "Menunggu", variant: "unpaid" },
  diproses: { label: "Diproses", variant: "draft" },
  dibeli: { label: "Dibeli", variant: "paid" },
  dibatalkan: { label: "Dibatalkan", variant: "out" },
};

export default async function PurchasingRequestPage({ searchParams }: PageProps<"/purchasing/produk-po">) {
  const sp = await searchParams;
  const { page, pageSize, skip } = parsePage(sp);
  await dbConnect();
  const [requests, total] = await Promise.all([
    PurchaseRequest.find().sort({ createdAt: -1, _id: -1 }).skip(skip).limit(pageSize).lean(),
    PurchaseRequest.countDocuments(),
  ]);
  clampPageOrRedirect("/purchasing/produk-po", sp, page, total, pageSize);

  return (
    <Panel>
      <PanelHead title="Request Produk PO dari Sales" />
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
                Qty
              </th>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Untuk Pelanggan
              </th>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Diminta Oleh
              </th>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Tanggal
              </th>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Status
              </th>
              <th className="border-b border-line px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => {
              const status = STATUS_LABEL[r.status ?? "diajukan"];
              const canAct = r.status === "diajukan" || r.status === "diproses";
              return (
                <tr key={String(r._id)} className="hover:bg-[#fbfaf5]">
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{r.nomor}</td>
                  <td className="border-b border-line px-5 py-4.5">
                    <div className="font-medium">{r.namaBarang}</div>
                    {r.deskripsi && <div className="font-mono text-[0.7rem] text-muted">{r.deskripsi}</div>}
                  </td>
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{r.qty}</td>
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.78rem] text-muted">
                    {r.customer?.nama ?? "—"}
                  </td>
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.78rem] text-muted">
                    {r.sales?.nama ?? r.diajukanOleh ?? "—"}
                  </td>
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                    {formatDateShort(r.createdAt!)}
                  </td>
                  <td className="border-b border-line px-5 py-4.5">
                    <Pill variant={status.variant}>{status.label}</Pill>
                  </td>
                  <td className="border-b border-line px-5 py-4.5">
                    {canAct && (
                      <RowActionLink href={`/purchasing/tagihan/baru?requestId=${r._id}`}>
                        Buat Material Order →
                      </RowActionLink>
                    )}
                  </td>
                </tr>
              );
            })}
            {requests.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center font-mono text-sm text-muted">
                  Belum ada request produk PO dari sales. Muncul di sini otomatis saat sales mengajukan lewat
                  Katalog → Request Produk PO.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>
      <Pagination basePath="/purchasing/produk-po" searchParams={sp} page={page} pageSize={pageSize} total={total} />
    </Panel>
  );
}
