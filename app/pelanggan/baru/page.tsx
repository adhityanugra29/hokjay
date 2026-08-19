import PageHeader from "@/components/layout/PageHeader";
import CustomerForm from "@/components/pelanggan/CustomerForm";

export default function PelangganBaruPage() {
  return (
    <>
      <PageHeader title="Tambah Pelanggan" subtitle="KODE PELANGGAN DIBUAT OTOMATIS" />
      <div className="p-6 md:p-9">
        <CustomerForm />
      </div>
    </>
  );
}
