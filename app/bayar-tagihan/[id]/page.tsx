import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import TagihanPaymentForm from "@/components/purchasing/TagihanPaymentForm";
import { dbConnect } from "@/lib/db";
import { PurchaseBill } from "@/models/PurchaseBill";

export const dynamic = "force-dynamic";

export default async function BayarTagihanDetailPage({ params }: PageProps<"/bayar-tagihan/[id]">) {
  const { id } = await params;
  await dbConnect();

  const bill = await PurchaseBill.findById(id).lean();
  if (!bill) notFound();
  if (bill.status === "dibayar") notFound(); // already paid — nothing left to do here

  return (
    <>
      <PageHeader
        title={`Bayar ${bill.nomor}`}
        subtitle={`${bill.namaBarang} · SUPPLIER ${bill.supplier.toUpperCase()}`}
      />
      <div className="p-6 md:p-9">
        <TagihanPaymentForm billId={String(bill._id)} total={bill.totalTagihan} />
      </div>
    </>
  );
}
