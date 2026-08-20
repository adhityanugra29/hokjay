import PageHeader from "@/components/layout/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import CustomerPicker from "@/components/penjualan/CustomerPicker";
import { dbConnect } from "@/lib/db";
import { Customer } from "@/models/Customer";

export const dynamic = "force-dynamic";

export default async function PenjualanPage({ searchParams }: PageProps<"/penjualan">) {
  const sp = await searchParams;
  const search = typeof sp.search === "string" ? sp.search : undefined;
  await dbConnect();

  const filter: Record<string, unknown> = {};
  if (search) filter.nama = { $regex: search, $options: "i" };
  const customers = await Customer.find(filter).sort({ nama: 1 }).lean();

  return (
    <>
      <PageHeader
        title="Penjualan"
        subtitle="PILIH PELANGGAN DULU, BARU LANJUT KE KATALOG"
        actions={<LinkButton href="/pelanggan/baru">+ Tambah Pelanggan</LinkButton>}
      />
      <div className="p-6 md:p-9">
        <CustomerPicker
          search={search}
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
