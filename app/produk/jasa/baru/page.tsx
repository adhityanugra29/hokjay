import PageHeader from "@/components/layout/PageHeader";
import JasaForm from "@/components/produk/JasaForm";

export default function JasaBaruPage() {
  return (
    <>
      <PageHeader title="Tambah Jasa" subtitle="JASA HANYA BISA DITAMBAHKAN DI INVOICE, TIDAK TAMPIL DI KATALOG" />
      <div className="p-6 md:p-9">
        <JasaForm mode="create" />
      </div>
    </>
  );
}
