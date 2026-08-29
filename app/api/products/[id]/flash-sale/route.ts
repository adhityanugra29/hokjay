import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { getSession } from "@/lib/auth/session";

/**
 * Owner-only top-down price lock — per the user's request 2026-08-29.
 * Unlike the general product PATCH route (app/api/products/[id]/route.ts,
 * which has no role check of its own — protection there is UI-only via
 * canEditProduct), this route enforces its own server-side role check,
 * since the entire point of Flash Sale is that a non-owner genuinely
 * can't move the price, not just that the button is hidden from them.
 */
const FLASH_SALE_ROLES = ["owner", "super_admin"];

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/products/[id]/flash-sale">) {
  const session = await getSession();
  if (!session || !FLASH_SALE_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Hanya Owner yang bisa mengatur Flash Sale" }, { status: 403 });
  }

  await dbConnect();
  const { id } = await ctx.params;
  const body = await req.json();

  try {
    const product = await Product.findById(id);
    if (!product) return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });

    if (body.active) {
      const harga = Number(body.harga);
      if (!harga || harga <= 0) {
        return NextResponse.json({ error: "Harga Flash Sale wajib diisi" }, { status: 400 });
      }
      product.flashSale = { active: true, harga, setBy: session.nama, setAt: new Date() };
    } else {
      product.flashSale = { active: false, harga: undefined, setBy: undefined, setAt: undefined };
    }

    await product.save();
    return NextResponse.json(product);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memperbarui Flash Sale" },
      { status: 400 }
    );
  }
}
