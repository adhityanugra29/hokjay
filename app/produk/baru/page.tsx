import PageHeader from "@/components/layout/PageHeader";
import ProductForm from "@/components/produk/ProductForm";
import { dbConnect } from "@/lib/db";
import { Category } from "@/models/Category";
import { getSession } from "@/lib/auth/session";
import { isKomisiSettingAllowed } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export default async function ProdukBaruPage() {
  await dbConnect();
  const [categories, session] = await Promise.all([
    Category.find().sort({ name: 1 }).lean(),
    getSession(),
  ]);
  const isOwner = isKomisiSettingAllowed(session?.role);

  return (
    <>
      <PageHeader title="Tambah Produk" subtitle="PRODUK BARU AKAN LANGSUNG TAMPIL DI KATALOG" />
      <div className="p-6 md:p-9">
        <ProductForm mode="create" categories={categories.map((c) => c.name)} isOwner={isOwner} />
      </div>
    </>
  );
}
