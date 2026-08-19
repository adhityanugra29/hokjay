import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { StockMovement } from "@/models/StockMovement";

export async function restockProduct(productId: string, qty: number, catatan?: string) {
  await dbConnect();
  if (qty <= 0) throw new Error("Jumlah restock harus lebih dari 0");

  const product = await Product.findById(productId);
  if (!product) throw new Error("Produk tidak ditemukan");

  product.stok += qty;
  await product.save();

  await StockMovement.create({
    product: product._id,
    productNameSnapshot: product.name,
    tipe: "masuk",
    qty,
    alasan: "Restock",
    catatan,
  });

  return product;
}
