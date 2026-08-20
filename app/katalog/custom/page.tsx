import PageHeader from "@/components/layout/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import ProductCard from "@/components/katalog/ProductCard";
import RequireActiveCustomer from "@/components/penjualan/RequireActiveCustomer";
import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";

export const dynamic = "force-dynamic";

export default async function KatalogCustomPage() {
  await dbConnect();
  // Only custom products that are still available — once a one-off item's
  // stock is used up, it drops off this list (see confirmation 2026-08-19).
  const products = await Product.find({ isCustom: true, stok: { $gt: 0 } })
    .sort({ createdAt: -1 })
    .lean();

  return (
    <RequireActiveCustomer>
      <PageHeader
        title="Produk Custom"
        subtitle="HASIL PESANAN CUSTOM · MASIH TERSEDIA"
        actions={
          <>
            <LinkButton variant="ghost" href="/katalog">
              ← Kembali ke Katalog
            </LinkButton>
            <LinkButton variant="violet" href="/katalog/custom-order">
              🛠 Pesan Produk Custom
            </LinkButton>
          </>
        }
      />
      <div className="p-6 md:p-9">
        <div className="grid grid-cols-2 gap-4.5 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard
              key={String(p._id)}
              product={{
                _id: String(p._id),
                name: p.name,
                category: p.category,
                hargaRekomendasi: p.hargaRekomendasi,
                hargaMinimum: p.hargaMinimum,
                komisiPercent: p.komisiPercent,
                komisiNominal: p.komisiNominal,
                stok: p.stok,
                kondisi: p.kondisi ?? "baru",
                dimensi: p.dimensi ?? undefined,
                ketebalan: p.ketebalan ?? undefined,
                fotoUrl: p.fotoUrl ?? undefined,
                isCustom: true,
              }}
            />
          ))}
          {products.length === 0 && (
            <div className="col-span-full py-10 text-center font-mono text-sm text-muted">
              Belum ada produk custom yang tersedia. Buat lewat &quot;Pesan Produk Custom&quot;.
            </div>
          )}
        </div>
      </div>
    </RequireActiveCustomer>
  );
}
