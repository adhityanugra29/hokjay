import KatalogClient from "@/components/katalog/KatalogClient";
import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";

export const dynamic = "force-dynamic";

export default async function KatalogPage() {
  await dbConnect();
  const [products, categories] = await Promise.all([
    // Custom-order products live on their own page (/katalog/custom) so
    // they don't clutter the regular stocked catalog — see confirmation
    // with the user 2026-08-19.
    Product.find({ isCustom: { $ne: true } })
      .sort({ name: 1 })
      .lean(),
    Category.find().sort({ name: 1 }).lean(),
  ]);

  return (
    <KatalogClient
      categories={categories.map((c) => c.name)}
      products={products.map((p) => ({
        _id: String(p._id),
        name: p.name,
        category: p.category,
        hargaRekomendasi: p.hargaRekomendasi,
        hargaMinimum: p.hargaMinimum,
        komisiPercent: p.komisiPercent,
        komisiNominal: p.komisiNominal,
        stok: p.stok,
        kondisi: p.kondisi ?? "baru",
        kondisiPercent: p.kondisiPercent ?? undefined,
        dimensi: p.dimensi ?? undefined,
        ketebalan: p.ketebalan ?? undefined,
        fotoUrl: p.fotoUrl ?? undefined,
        isCustom: p.isCustom ?? false,
      }))}
    />
  );
}
