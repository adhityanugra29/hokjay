import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import DpForm from "@/components/invoice/DpForm";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { PaymentMethod } from "@/models/PaymentMethod";
import { rupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InvoiceDpPage({ params }: PageProps<"/invoice/[id]/dp">) {
  const { id } = await params;
  await dbConnect();
  const [invoice, paymentMethods] = await Promise.all([
    Invoice.findById(id),
    PaymentMethod.find().sort({ name: 1 }).lean(),
  ]);
  if (!invoice) notFound();
  if (invoice.status !== "unpaid" || invoice.dp?.nominal) notFound();

  return (
    <>
      <PageHeader
        title="Catat DP"
        subtitle={`${invoice.nomor} · ${invoice.customer!.nama.toUpperCase()} · ${rupiah(invoice.grandTotal)}`}
      />
      <div className="p-6 md:p-9">
        <DpForm
          invoiceId={id}
          nomor={invoice.nomor}
          customerNama={invoice.customer!.nama}
          grandTotal={invoice.grandTotal}
          paymentMethods={paymentMethods.map((m) => m.name)}
        />
      </div>
    </>
  );
}
