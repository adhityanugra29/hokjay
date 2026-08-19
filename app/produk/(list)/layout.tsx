import PageHeader from "@/components/layout/PageHeader";
import SubnavTabs from "@/components/ui/SubnavTabs";
import { LinkButton } from "@/components/ui/Button";
import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";

export const dynamic = "force-dynamic";

export default async function ProdukLayout({ children }: { children: React.ReactNode }) {
  await dbConnect();
  const count = await Product.countDocuments();

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle={`${count} PRODUK AKTIF`}
        actions={<LinkButton href="/produk/baru">+ Tambah Produk</LinkButton>}
      />
      <div className="p-6 md:p-9">
        <SubnavTabs
          tabs={[
            { href: "/produk", label: "Semua Produk" },
            { href: "/produk/kategori", label: "Kategori" },
            { href: "/produk/riwayat", label: "Riwayat Stok Masuk/Keluar" },
          ]}
        />
        {children}
      </div>
    </>
  );
}
