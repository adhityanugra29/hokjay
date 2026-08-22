import PageHeader from "@/components/layout/PageHeader";
import PurchaseBillForm from "@/components/purchasing/PurchaseBillForm";
import { dbConnect } from "@/lib/db";
import { PurchaseRequest } from "@/models/PurchaseRequest";

export const dynamic = "force-dynamic";

export default async function PurchasingTagihanBaruPage({
  searchParams,
}: PageProps<"/purchasing/tagihan/baru">) {
  const sp = await searchParams;
  const requestId = typeof sp.requestId === "string" ? sp.requestId : undefined;

  await dbConnect();
  const request = requestId ? await PurchaseRequest.findById(requestId).lean() : null;

  return (
    <>
      <PageHeader
        title="Buat Tagihan Pembelian"
        subtitle="ISI SETELAH SUPPLIER & HARGA SUDAH DIDAPAT · FINANCE AKAN MEMBAYAR INI"
      />
      <div className="p-6 md:p-9">
        <PurchaseBillForm
          fromRequest={
            request ? { _id: String(request._id), nomor: request.nomor, namaBarang: request.namaBarang, qty: request.qty } : undefined
          }
        />
      </div>
    </>
  );
}
