import PageHeader from "@/components/layout/PageHeader";
import ProductForm from "@/components/produk/ProductForm";
import { dbConnect } from "@/lib/db";
import { Category } from "@/models/Category";

export const dynamic = "force-dynamic";

export default async function ProdukBaruPage() {
  await dbConnect();
  const categories = await Category.find().sort({ name: 1 }).lean();

  return (
    <>
      <PageHeader title="Tambah Produk" subtitle="PRODUK BARU AKAN LANGSUNG TAMPIL DI KATALOG" />
      <div className="p-6 md:p-9">
        <ProductForm mode="create" categories={categories.map((c) => c.name)} />
      </div>
    </>
  );
}
