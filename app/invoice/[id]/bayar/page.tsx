import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import PaymentForm from "@/components/invoice/PaymentForm";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Courier } from "@/models/Courier";
import { PaymentMethod } from "@/models/PaymentMethod";
import { rupiah } from "@/lib/format";
import { getSession } from "@/lib/auth/session";
import { isInvoiceBlockedForSession } from "@/lib/invoice-visibility";

export const dynamic = "force-dynamic";

export default async function InvoiceBayarPage({ params }: PageProps<"/invoice/[id]/bayar">) {
  const { id } = await params;
  await dbConnect();
  const [invoice, couriers, paymentMethods] = await Promise.all([
    Invoice.findById(id),
    Courier.find().sort({ name: 1 }).lean(),
    PaymentMethod.find().sort({ name: 1 }).lean(),
  ]);
  if (!invoice) notFound();
  // Per-sales invoice privacy — per the user's request 2026-08-29.
  const session = await getSession();
  if (isInvoiceBlockedForSession(session, invoice.sales?.nama)) notFound();

  return (
    <>
      <PageHeader
        title="Konfirmasi Pembayaran"
        subtitle={`${invoice.nomor} · ${invoice.customer!.nama.toUpperCase()} · ${rupiah(invoice.grandTotal)}`}
      />
      <div className="p-6 md:p-9">
        <PaymentForm
          invoiceId={id}
          nomor={invoice.nomor}
          customerNama={invoice.customer!.nama}
          salesNama={invoice.sales!.nama}
          grandTotal={invoice.grandTotal}
          dpNominal={invoice.dp?.nominal ?? 0}
          paymentMethods={paymentMethods.map((m) => m.name)}
          couriers={couriers.map((c) => ({ _id: String(c._id), name: c.name }))}
        />
      </div>
    </>
  );
}
