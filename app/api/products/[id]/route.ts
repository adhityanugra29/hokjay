import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { getSession } from "@/lib/auth/session";
import { isProductDeleteAllowed } from "@/lib/auth/access";

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
    "merk",
    "sku",
    "category",
    "kondisi",
    "kondisiPercent",
    "tipeProduk",
    "hargaBeli",
    "hargaRekomendasi",
    "hargaMinimum",
    // komisiPercent / komisiBekasPercent deliberately NOT here — both are
    // Owner-only, handled exclusively by
    // app/api/products/[id]/komisi-bekas/route.ts (own server-side role
    // check). Per the user's request 2026-09-03.
    "stok",
    "tanggalBarangMasuk",
    "stokMinimum",
    "alertHariTidakTerjual",
    "dimensi",
    "ketebalan",
    "dayaListrik",
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

// Owner-only (2026-09-07) — previously had no role check at all, see
// lib/auth/access.ts's isProductDeleteAllowed doc comment.
export async function DELETE(_req: Request, ctx: RouteContext<"/api/products/[id]">) {
  const session = await getSession();
  if (!isProductDeleteAllowed(session?.role)) {
    return NextResponse.json({ error: "Hanya Owner yang bisa menghapus produk" }, { status: 403 });
  }
  await dbConnect();
  const { id } = await ctx.params;
  const product = await Product.findByIdAndDelete(id);
  if (!product) return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
