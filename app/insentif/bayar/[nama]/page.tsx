import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import KomisiPaymentForm from "@/components/insentif/KomisiPaymentForm";
import { getUnpaidCommissionInvoices } from "@/lib/insentif";

export const dynamic = "force-dynamic";

export default async function InsentifBayarSalesPage({ params }: PageProps<"/insentif/bayar/[nama]">) {
  const { nama } = await params;
  const salesNama = decodeURIComponent(nama);
  if (!salesNama) notFound();

  const invoices = await getUnpaidCommissionInvoices(salesNama);

  return (
    <>
      <PageHeader title={`Bayar Komisi — ${salesNama}`} subtitle="PILIH INVOICE, LALU BAYAR SEKALIGUS" />
      <div className="p-6 md:p-9">
        <KomisiPaymentForm salesNama={salesNama} invoices={invoices} />
      </div>
    </>
  );
}
