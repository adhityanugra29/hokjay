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
        {bill.supplierBank && (
          <div className="mb-5 max-w-2xl border-l-4 border-accent bg-[#f7f5ee] p-4">
            <div className="font-mono text-[0.68rem] uppercase tracking-wide text-muted">Transfer ke</div>
            <div className="mt-1 font-sans text-[1rem] font-extrabold">
              {bill.supplierBank} — {bill.supplierNomorRekening}
            </div>
            <div className="mt-1 font-mono text-[0.75rem] text-muted">
              a.n. {bill.supplier}
              {bill.supplierAlamat ? ` · ${bill.supplierAlamat}` : ""}
            </div>
          </div>
        )}
        <TagihanPaymentForm billId={String(bill._id)} total={bill.totalTagihan} />
      </div>
    </>
  );
}
