import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import CustomerForm from "@/components/pelanggan/CustomerForm";
import { dbConnect } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function PelangganEditPage({ params }: PageProps<"/pelanggan/[id]/edit">) {
  const { id } = await params;
  await dbConnect();
  const customer = await Customer.findById(id).lean();
  if (!customer) notFound();

  // Same per-sales privacy guard as the detail page (app/pelanggan/[id]/page.tsx).
  const session = await getSession();
  if (session?.role === "sales" && customer.assignedSales && customer.assignedSales !== session.nama) {
    notFound();
  }

  return (
    <>
      <PageHeader title={`Ubah ${customer.nama}`} subtitle={customer.kode} />
      <div className="p-6 md:p-9">
        <CustomerForm
          mode="edit"
          customerId={id}
          initial={{
            nama: customer.nama,
            namaToko: customer.namaToko,
            jenisUsaha: customer.jenisUsaha,
            whatsapp: customer.whatsapp,
            email: customer.email ?? "",
            alamat: customer.alamat,
            provinsi: customer.provinsi,
            kota: customer.kota,
            termHari: String(customer.termHari ?? 0),
            catatan: customer.catatan ?? "",
          }}
        />
      </div>
    </>
  );
}
