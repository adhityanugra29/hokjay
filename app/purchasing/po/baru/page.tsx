import PageHeader from "@/components/layout/PageHeader";
import PurchaseOrderForm from "@/components/purchasing/PurchaseOrderForm";
import { dbConnect } from "@/lib/db";
import { Supplier } from "@/models/Supplier";
import { Product } from "@/models/Product";

export const dynamic = "force-dynamic";

export default async function PurchaseOrderBaruPage({
  searchParams,
}: PageProps<"/purchasing/po/baru">) {
  const sp = await searchParams;
  await dbConnect();
  const [suppliers, products] = await Promise.all([
    Supplier.find().sort({ namaUsaha: 1 }).lean(),
    Product.find({ isCustom: { $ne: true } }).sort({ name: 1 }).lean(),
  ]);

  return (
    <>
      <PageHeader title="Buat PO" subtitle="PILIH SUPPLIER & BARANG · STOK BERTAMBAH OTOMATIS SAAT DITANDAI DITERIMA" />
      <div className="p-6 md:p-9">
        <PurchaseOrderForm
          suppliers={suppliers.map((s) => ({ _id: String(s._id), namaUsaha: s.namaUsaha }))}
          products={products.map((p) => ({ _id: String(p._id), name: p.name, hargaBeli: p.hargaBeli }))}
          initial={{
            supplierId: typeof sp.supplierId === "string" ? sp.supplierId : undefined,
            productId: typeof sp.productId === "string" ? sp.productId : undefined,
            qty: typeof sp.qty === "string" ? sp.qty : undefined,
          }}
        />
      </div>
    </>
  );
}
