import KatalogClient from "@/components/katalog/KatalogClient";
import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { StockMovement } from "@/models/StockMovement";

export const dynamic = "force-dynamic";

export default async function KatalogPage() {
  await dbConnect();
  const [products, categories, soldProductIds] = await Promise.all([
    // Custom-order products live on their own page (/katalog/custom) so
    // they don't clutter the regular stocked catalog — see confirmation
    // with the user 2026-08-19. Sold-out (stok 0) products are hidden too
    // — per the user's request 2026-08-25 — mirroring the same "hide, don't
    // delete" convention already used on Inventory's list (the stock/history
    // data stays intact, it just doesn't show here to browse/sell).
    Product.find({ isCustom: { $ne: true }, stok: { $gt: 0 } })
      .sort({ name: 1 })
      .lean(),
    Category.find().sort({ name: 1 }).lean(),
    // Which products have sold at least once — powers the "Sudah Terjual"
    // badge on each card (still pickable, just flagged) so sales knows
    // it's not a brand-new/untouched item. Per the user's request
    // 2026-08-25.
    StockMovement.distinct("product", { alasan: "Penjualan" }),
  ]);
  const soldSet = new Set(soldProductIds.map((id) => String(id)));

  return (
    <KatalogClient
      categories={categories.map((c) => c.name)}
      products={products.map((p) => ({
        _id: String(p._id),
        name: p.name,
        sku: p.sku,
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
        sudahTerjual: soldSet.has(String(p._id)),
      }))}
    />
  );
}
