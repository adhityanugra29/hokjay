import OfficeAssetManager from "@/components/purchasing/OfficeAssetManager";
import { dbConnect } from "@/lib/db";
import { PurchaseBill } from "@/models/PurchaseBill";

export const dynamic = "force-dynamic";

export default async function PurchasingInventarisPage({
  searchParams,
}: PageProps<"/purchasing/inventaris">) {
  const sp = await searchParams;
  const billId = typeof sp.billId === "string" ? sp.billId : undefined;

  await dbConnect();
  const bill = billId ? await PurchaseBill.findById(billId).lean() : null;

  return (
    <OfficeAssetManager
      prefillFromBill={
        bill
          ? { _id: String(bill._id), nomor: bill.nomor, namaBarang: bill.namaBarang, qty: bill.qty, totalTagihan: bill.totalTagihan }
          : undefined
      }
    />
  );
}
