import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import ProductForm from "@/components/produk/ProductForm";
import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";

export const dynamic = "force-dynamic";

export default async function ProdukEditPage({ params }: PageProps<"/produk/[id]/edit">) {
  const { id } = await params;
  await dbConnect();
  const [product, categories] = await Promise.all([
    Product.findById(id).lean(),
    Category.find().sort({ name: 1 }).lean(),
  ]);
  if (!product) notFound();

  return (
    <>
      <PageHeader title={`Ubah ${product.name}`} subtitle={`SKU ${product.sku}`} />
      <div className="p-6 md:p-9">
        <ProductForm
          mode="edit"
          productId={id}
          categories={categories.map((c) => c.name)}
          initial={{
            name: product.name,
            category: product.category,
            kondisi: product.kondisi as "baru" | "bekas",
            kondisiPercent: product.kondisiPercent ? String(product.kondisiPercent) : "",
            tipeProduk: (product.tipeProduk as "elektronik" | "non-elektronik") ?? "non-elektronik",
            hargaBeli: String(product.hargaBeli),
            hargaRekomendasi: String(product.hargaRekomendasi),
            hargaMinimum: String(product.hargaMinimum),
            komisiPercent: String(product.komisiPercent),
            stok: String(product.stok),
            stokMinimum: String(product.stokMinimum ?? 5),
            alertHariTidakTerjual: String(product.alertHariTidakTerjual ?? ""),
            panjangCm: product.dimensi?.panjangCm ? String(product.dimensi.panjangCm) : "",
            lebarCm: product.dimensi?.lebarCm ? String(product.dimensi.lebarCm) : "",
            tinggiCm: product.dimensi?.tinggiCm ? String(product.dimensi.tinggiCm) : "",
            ketebalan: product.ketebalan ?? "",
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
