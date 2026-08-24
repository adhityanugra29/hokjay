import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import { RowActionLink } from "@/components/ui/RowAction";
import Pill, { type PillVariant } from "@/components/ui/Pill";
import { dbConnect } from "@/lib/db";
import { OfficeExpenseRequest } from "@/models/OfficeExpenseRequest";
import { rupiah, formatDateShort } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; variant: PillVariant }> = {
  diajukan: { label: "Menunggu Approval", variant: "unpaid" },
  disetujui: { label: "Disetujui", variant: "draft" },
  ditolak: { label: "Ditolak", variant: "out" },
  dibayar: { label: "Sudah Ditransfer", variant: "low" },
  selesai: { label: "Selesai", variant: "paid" },
};

const KATEGORI_LABEL: Record<string, string> = {
  listrik: "Listrik",
  internet: "Internet / WiFi",
  pulsa: "Pulsa",
  lainnya: "Lainnya",
};

/** Job Order (renamed from "Kebutuhan Kantor" 2026-08-23) — office operational expenses (listrik, wifi, pulsa, dll), not resale merchandise. See models/OfficeExpenseRequest.ts. */
export default async function PurchasingJobOrderPage() {
  await dbConnect();
  const requests = await OfficeExpenseRequest.find().sort({ createdAt: -1 }).lean();

  return (
    <Panel>
      <PanelHead title="Semua Job Order" />
      <TableScroll>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Nomor
              </th>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Kebutuhan
              </th>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Kategori
              </th>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Jumlah
              </th>
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Diajukan Oleh
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
              return (
                <tr key={String(r._id)} className="hover:bg-[#fbfaf5]">
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{r.nomor}</td>
                  <td className="border-b border-line px-5 py-4.5 font-medium">
                    {r.nama}
                    {r.alasan && <div className="font-mono text-[0.7rem] text-muted">{r.alasan}</div>}
                  </td>
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.78rem] text-muted">
                    {KATEGORI_LABEL[r.kategori] ?? r.kategori}
                  </td>
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{rupiah(r.jumlah)}</td>
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.78rem] text-muted">
                    {r.diajukanOleh ?? "—"}
                  </td>
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                    {formatDateShort(r.createdAt!)}
                  </td>
                  <td className="border-b border-line px-5 py-4.5">
                    <Pill variant={status.variant}>{status.label}</Pill>
                  </td>
                  <td className="border-b border-line px-5 py-4.5">
                    <RowActionLink href={`/purchasing/${r._id}`}>Lihat →</RowActionLink>
                  </td>
                </tr>
              );
            })}
            {requests.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center font-mono text-sm text-muted">
                  Belum ada Job Order. Contoh: bayar tagihan listrik, top up wifi, atau pulsa kantor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>
    </Panel>
  );
}
