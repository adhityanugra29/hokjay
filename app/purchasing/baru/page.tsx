import PageHeader from "@/components/layout/PageHeader";
import PurchaseRequestForm from "@/components/purchasing/PurchaseRequestForm";
import { dbConnect } from "@/lib/db";
import { Sales } from "@/models/Sales";

export const dynamic = "force-dynamic";

export default async function PurchasingRequestBaruPage() {
  await dbConnect();
  const salesList = await Sales.find({ aktif: true }).sort({ nama: 1 }).lean();

  return (
    <>
      <PageHeader title="Request Pembelian Baru" subtitle="UNTUK KEBUTUHAN RESTOCK UMUM, TANPA PELANGGAN SPESIFIK" />
      <div className="p-6 md:p-9">
        <PurchaseRequestForm
          mode="purchasing"
          salesList={salesList.map((s) => ({ _id: String(s._id), nama: s.nama }))}
          redirectTo="/purchasing"
        />
      </div>
    </>
  );
}
