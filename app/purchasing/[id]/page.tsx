import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import OfficeExpenseDetail from "@/components/purchasing/OfficeExpenseDetail";
import { dbConnect } from "@/lib/db";
import { OfficeExpenseRequest } from "@/models/OfficeExpenseRequest";
import { requireSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function PurchasingKebutuhanKantorDetailPage({ params }: PageProps<"/purchasing/[id]">) {
  const { id } = await params;
  await dbConnect();

  const [request, session] = await Promise.all([OfficeExpenseRequest.findById(id).lean(), requireSession()]);
  if (!request) notFound();

  return (
    <>
      <PageHeader title={request.nama} subtitle="KEBUTUHAN KANTOR" />
      <div className="p-6 md:p-9">
        <OfficeExpenseDetail
          role={session.role}
          data={{
            _id: String(request._id),
            nama: request.nama,
            kategori: request.kategori,
            jumlah: request.jumlah,
            alasan: request.alasan ?? undefined,
            diajukanOleh: request.diajukanOleh ?? undefined,
            createdAt: request.createdAt!.toISOString(),
            status: request.status,
            disetujuiOleh: request.disetujuiOleh ?? undefined,
            disetujuiTanggal: request.disetujuiTanggal?.toISOString(),
            alasanTolak: request.alasanTolak ?? undefined,
            buktiTransferUrl: request.buktiTransferUrl ?? undefined,
            buktiTransferTanggal: request.buktiTransferTanggal?.toISOString(),
            buktiTransferNominal: request.buktiTransferNominal ?? undefined,
            buktiTransferOleh: request.buktiTransferOleh ?? undefined,
            buktiBerhasilUrl: request.buktiBerhasilUrl ?? undefined,
            buktiBerhasilCatatan: request.buktiBerhasilCatatan ?? undefined,
            buktiBerhasilTanggal: request.buktiBerhasilTanggal?.toISOString(),
            buktiBerhasilOleh: request.buktiBerhasilOleh ?? undefined,
          }}
        />
      </div>
    </>
  );
}
