import PageHeader from "@/components/layout/PageHeader";
import BulkProductWizard from "@/components/produk/BulkProductWizard";
import { dbConnect } from "@/lib/db";
import { Category } from "@/models/Category";
import { getSession } from "@/lib/auth/session";
import { isKomisiSettingAllowed } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export default async function ProdukBaruMassalPage() {
  await dbConnect();
  const [categories, session] = await Promise.all([
    Category.find().sort({ name: 1 }).lean(),
    getSession(),
  ]);
  const isOwner = isKomisiSettingAllowed(session?.role);

  return (
    <>
      <PageHeader title="Tambah Banyak Produk" subtitle="UNGGAH FOTO SEKALIGUS, LALU ISI DATA TIAP PRODUK SATU PER SATU" />
      <div className="p-6 md:p-9">
        <BulkProductWizard categories={categories.map((c) => c.name)} isOwner={isOwner} />
      </div>
    </>
  );
}
