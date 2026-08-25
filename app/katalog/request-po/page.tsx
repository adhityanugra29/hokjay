import PageHeader from "@/components/layout/PageHeader";
import PurchaseRequestForm from "@/components/purchasing/PurchaseRequestForm";
import { dbConnect } from "@/lib/db";
import { Sales } from "@/models/Sales";
import { Customer } from "@/models/Customer";

export const dynamic = "force-dynamic";

/**
 * "Request Produk PO" — for a barang customer needs that isn't in the
 * catalog or warehouse yet. Sales fills this in and it lands on the
 * Purchasing team's desk as a PurchaseRequest for them to source — see
 * confirmation with the user 2026-08-22. Picks its own pelanggan inline
 * (mirrors InvoiceForm) since the old /penjualan "pick customer first"
 * page was dropped per the user's request 2026-08-25.
 */
export default async function KatalogRequestPOPage() {
  await dbConnect();
  const [salesList, customers] = await Promise.all([
    Sales.find({ aktif: true }).sort({ nama: 1 }).lean(),
    Customer.find().sort({ nama: 1 }).lean(),
  ]);

  return (
    <>
      <PageHeader
        title="Request Produk PO"
        subtitle="BARANG BELUM ADA DI KATALOG/GUDANG · TIM PURCHASING AKAN MEMBELIKANNYA"
      />
      <div className="p-6 md:p-9">
        <PurchaseRequestForm
          salesList={salesList.map((s) => ({ _id: String(s._id), nama: s.nama }))}
          customers={customers.map((c) => ({ _id: String(c._id), nama: c.nama }))}
          redirectTo="/katalog"
        />
      </div>
    </>
  );
}
