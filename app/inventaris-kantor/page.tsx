import PageHeader from "@/components/layout/PageHeader";
import OfficeAssetManager from "@/components/inventaris/OfficeAssetManager";
import { dbConnect } from "@/lib/db";
import { PurchaseBill } from "@/models/PurchaseBill";

export const dynamic = "force-dynamic";

/** Standalone module, separated out from Purchasing per the user's request 2026-08-23. */
export default async function InventarisKantorPage({
  searchParams,
}: PageProps<"/inventaris-kantor">) {
  const sp = await searchParams;
  const billId = typeof sp.billId === "string" ? sp.billId : undefined;

  await dbConnect();
  const bill = billId ? await PurchaseBill.findById(billId).lean() : null;

  return (
    <>
      <PageHeader
        title="Inventaris Kantor"
        subtitle="BARANG MILIK KANTOR — PERALATAN (ASET) & HABIS PAKAI, TERMASUK YANG DIBELI LEWAT MATERIAL ORDER"
      />
      <div className="p-6 md:p-9">
        <OfficeAssetManager
          prefillFromBill={
            bill
              ? { _id: String(bill._id), nomor: bill.nomor, namaBarang: bill.namaBarang, qty: bill.qty, totalTagihan: bill.totalTagihan }
              : undefined
          }
        />
      </div>
    </>
  );
}
