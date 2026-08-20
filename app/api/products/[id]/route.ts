import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";

export async function GET(_req: Request, ctx: RouteContext<"/api/products/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  const product = await Product.findById(id);
  if (!product) return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/products/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  const body = await req.json();

  const update: Record<string, unknown> = {};
  for (const key of [
    "name",
    "sku",
    "category",
    "kondisi",
    "kondisiPercent",
    "tipeProduk",
    "hargaBeli",
    "hargaRekomendasi",
    "hargaMinimum",
    "komisiPercent",
    "stok",
    "alertHariTidakTerjual",
    "dimensi",
    "ketebalan",
    "fotoUrl",
    "fotoSampingUrl",
    "fotoBelakangUrl",
    "deskripsi",
  ]) {
    if (body[key] !== undefined) update[key] = body[key];
  }

  try {
    const product = await Product.findById(id);
    if (!product) return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
    Object.assign(product, update);
    await product.save();
    return NextResponse.json(product);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memperbarui produk" },
      { status: 400 }
    );
  }
}
