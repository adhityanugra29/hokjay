import PageHeader from "@/components/layout/PageHeader";
import PurchaseRequestForm from "@/components/purchasing/PurchaseRequestForm";
import RequireActiveCustomer from "@/components/penjualan/RequireActiveCustomer";
import { dbConnect } from "@/lib/db";
import { Sales } from "@/models/Sales";

export const dynamic = "force-dynamic";

/**
 * "Request Produk PO" — for a barang customer needs that isn't in the
 * catalog or warehouse yet. Sales fills this in and it lands on the
 * Purchasing team's desk as a PurchaseRequest for them to source — see
 * confirmation with the user 2026-08-22.
 */
export default async function KatalogRequestPOPage() {
  await dbConnect();
  const salesList = await Sales.find({ aktif: true }).sort({ nama: 1 }).lean();

  return (
    <RequireActiveCustomer>
      <PageHeader
        title="Request Produk PO"
        subtitle="BARANG BELUM ADA DI KATALOG/GUDANG · TIM PURCHASING AKAN MEMBELIKANNYA"
      />
      <div className="p-6 md:p-9">
        <PurchaseRequestForm
          mode="sales"
          salesList={salesList.map((s) => ({ _id: String(s._id), nama: s.nama }))}
          redirectTo="/katalog"
        />
      </div>
    </RequireActiveCustomer>
  );
}
