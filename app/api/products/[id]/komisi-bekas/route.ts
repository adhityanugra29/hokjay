import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { getSession } from "@/lib/auth/session";

/**
 * Owner-only commission fields — per-product override of the barang-bekas
 * rate (komisiBekasPercent) AND the reference "Komisi — Persen" figure
 * (komisiPercent, drives the Hot Products dashboard highlight). Both were
 * originally editable by anyone with canEditProduct (Manager included);
 * per the user's request 2026-09-03 ("manager tidak boleh untuk edit
 * komisi... hanya owner yang boleh") neither is anymore. Same isolation
 * pattern as flash-sale/route.ts: the general product PATCH route
 * (app/api/products/[id]/route.ts) has no role check of its own and
 * deliberately does NOT accept either field, so a Manager saving unrelated
 * changes there can never touch or silently wipe an Owner-set value.
 */
const KOMISI_ROLES = ["owner", "super_admin"];

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/products/[id]/komisi-bekas">) {
  const session = await getSession();
  if (!session || !KOMISI_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Hanya Owner yang bisa mengatur Komisi" }, { status: 403 });
  }

  await dbConnect();
  const { id } = await ctx.params;
  const body = await req.json();

  try {
    const product = await Product.findById(id);
    if (!product) return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });

    // null/undefined clears the override (falls back to the category
    // default / global 10%) — a real number 0-100 sets it.
    if (body.komisiBekasPercent !== undefined) {
      const raw = body.komisiBekasPercent;
      if (raw !== null && (typeof raw !== "number" || raw < 0 || raw > 100)) {
        return NextResponse.json({ error: "Komisi Bekas harus angka 0-100" }, { status: 400 });
      }
      product.komisiBekasPercent = raw === null ? undefined : raw;
    }

    // Reference figure — required by the schema (has a default), so unlike
    // komisiBekasPercent above there's no "clear it" case, only "set it".
    if (body.komisiPercent !== undefined) {
      const raw = body.komisiPercent;
      if (typeof raw !== "number" || raw < 0 || raw > 100) {
        return NextResponse.json({ error: "Komisi — Persen harus angka 0-100" }, { status: 400 });
      }
      product.komisiPercent = raw;
    }

    await product.save();
    return NextResponse.json(product);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memperbarui Komisi" },
      { status: 400 }
    );
  }
}
