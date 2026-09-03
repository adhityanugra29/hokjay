import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { getSession } from "@/lib/auth/session";

/**
 * Owner-only per-product override of the barang-bekas commission rate —
 * per the user's request 2026-09-03 ("owner bisa edit by produk"). Same
 * isolation pattern as flash-sale/route.ts: the general product PATCH
 * route (app/api/products/[id]/route.ts) has no role check of its own and
 * deliberately does NOT accept this field, so a Manager saving unrelated
 * changes there can never touch or silently wipe an Owner-set override.
 */
const KOMISI_BEKAS_ROLES = ["owner", "super_admin"];

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/products/[id]/komisi-bekas">) {
  const session = await getSession();
  if (!session || !KOMISI_BEKAS_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Hanya Owner yang bisa mengatur Komisi Bekas" }, { status: 403 });
  }

  await dbConnect();
  const { id } = await ctx.params;
  const body = await req.json();

  // null/undefined clears the override (falls back to the category default
  // / global 10%) — a real number 0-100 sets it. Anything else is rejected.
  const raw = body.komisiBekasPercent;
  if (raw !== null && raw !== undefined && (typeof raw !== "number" || raw < 0 || raw > 100)) {
    return NextResponse.json({ error: "Komisi Bekas harus angka 0-100" }, { status: 400 });
  }

  try {
    const product = await Product.findById(id);
    if (!product) return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
    product.komisiBekasPercent = raw === null ? undefined : raw;
    await product.save();
    return NextResponse.json(product);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memperbarui Komisi Bekas" },
      { status: 400 }
    );
  }
}
