import PageHeader from "@/components/layout/PageHeader";
import CustomerPicker from "@/components/penjualan/CustomerPicker";
import { dbConnect } from "@/lib/db";
import { Customer } from "@/models/Customer";

export const dynamic = "force-dynamic";

export default async function PenjualanPage() {
  await dbConnect();
  const customers = await Customer.find().sort({ nama: 1 }).lean();

  return (
    <>
      <PageHeader title="Penjualan" subtitle="CARI PELANGGAN, LALU AYO JUALAN" />
      <div className="p-6 md:p-9">
        <CustomerPicker
          customers={customers.map((c) => ({
            _id: String(c._id),
            kode: c.kode,
            nama: c.nama,
            whatsapp: c.whatsapp,
            alamat: c.alamat,
          }))}
        />
      </div>
    </>
  );
}
