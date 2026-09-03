import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import ProductForm from "@/components/produk/ProductForm";
import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// Owner-only, matching app/katalog/page.tsx's CAN_FLASH_SALE_ROLES/
// app/api/products/[id]/komisi-bekas/route.ts. Per the user's request
// 2026-09-03.
const KOMISI_BEKAS_ROLES = ["owner", "super_admin"];

export default async function ProdukEditPage({ params }: PageProps<"/produk/[id]/edit">) {
  const { id } = await params;
  await dbConnect();
  const [product, categories, session] = await Promise.all([
    Product.findById(id).lean(),
    Category.find().sort({ name: 1 }).lean(),
    getSession(),
  ]);
  if (!product) notFound();
  const isOwner = !!session && KOMISI_BEKAS_ROLES.includes(session.role);

  return (
    <>
      <PageHeader title={`Ubah ${product.name}`} subtitle={`SKU ${product.sku}`} />
      <div className="p-6 md:p-9">
        <ProductForm
          mode="edit"
          productId={id}
          categories={categories.map((c) => c.name)}
          isOwner={isOwner}
          initial={{
            name: product.name,
            merk: product.merk ?? "",
            category: product.category,
            kondisi: product.kondisi as "baru" | "bekas",
            kondisiPercent: product.kondisiPercent ? String(product.kondisiPercent) : "",
            tipeProduk: (product.tipeProduk as "elektronik" | "non-elektronik") ?? "non-elektronik",
            hargaRekomendasi: String(product.hargaRekomendasi),
            hargaMinimum: String(product.hargaMinimum),
            komisiPercent: String(product.komisiPercent),
            komisiBekasPercent: product.komisiBekasPercent !== undefined ? String(product.komisiBekasPercent) : "",
            stok: String(product.stok),
            tanggalBarangMasuk: product.tanggalBarangMasuk ? new Date(product.tanggalBarangMasuk).toISOString().slice(0, 10) : "",
            stokMinimum: String(product.stokMinimum ?? 5),
            alertHariTidakTerjual: String(product.alertHariTidakTerjual ?? ""),
            panjangCm: product.dimensi?.panjangCm ? String(product.dimensi.panjangCm) : "",
            lebarCm: product.dimensi?.lebarCm ? String(product.dimensi.lebarCm) : "",
            tinggiCm: product.dimensi?.tinggiCm ? String(product.dimensi.tinggiCm) : "",
            ketebalan: product.ketebalan ?? "",
            dayaListrik: product.dayaListrik ?? "",
            fotoUrl: product.fotoUrl ?? "",
            fotoSampingUrl: product.fotoSampingUrl ?? "",
            fotoBelakangUrl: product.fotoBelakangUrl ?? "",
            deskripsi: product.deskripsi ?? "",
          }}
        />
      </div>
    </>
  );
}
