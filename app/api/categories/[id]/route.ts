import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { getSession } from "@/lib/auth/session";

// Owner-only, same as the per-product override at
// app/api/products/[id]/komisi-bekas/route.ts — per the user's request
// 2026-09-03. Doesn't affect the rename below, which any admin-level role
// could already do (Category writes are gated ADMIN_ONLY_WRITE_PREFIXES,
// see lib/auth/access.ts) — this is an extra, narrower check on top, only
// for this one field.
const KOMISI_BEKAS_ROLES = ["owner", "super_admin"];

/**
 * Renames a category — per the user's request 2026-08-27 ("di kelola
 * kategori bisa hapus dan edit ya"), Hapus already existed but there was no
 * way to rename one. Product.category is a plain string snapshot, not a
 * reference to this Category document, so a rename here has to cascade to
 * every Product currently carrying the old name — otherwise those products
 * would silently fall out of the Katalog category filter, Inventory
 * grouping, and the Katalog PDF's "Daftar Isi Katalog" the moment the name
 * changed, without dropping their category outright.
 *
 * Also accepts komisiBekasPercent (2026-09-03) — the Owner-only default
 * barang-bekas commission rate for every product in this category that
 * doesn't have its own override (see resolveKomisiBekasPercent() in
 * lib/commission.ts). Silently ignored (not rejected) for a non-owner
 * request, same as name-rename working normally alongside it.
 */
export async function PATCH(req: Request, ctx: RouteContext<"/api/categories/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Nama kategori tidak boleh kosong" }, { status: 400 });
  }

  const existing = await Category.findById(id);
  if (!existing) return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });

  if (body.komisiBekasPercent !== undefined) {
    const session = await getSession();
    if (session && KOMISI_BEKAS_ROLES.includes(session.role)) {
      const raw = body.komisiBekasPercent;
      if (raw === null) {
        existing.komisiBekasPercent = undefined;
      } else if (typeof raw === "number" && raw >= 0 && raw <= 100) {
        existing.komisiBekasPercent = raw;
      } else {
        return NextResponse.json({ error: "Komisi Bekas harus angka 0-100" }, { status: 400 });
      }
    }
  }

  const oldName = existing.name;
  if (oldName === name) {
    await existing.save();
    return NextResponse.json(existing);
  }

  try {
    existing.name = name;
    await existing.save();
    await Product.updateMany({ category: oldName }, { $set: { category: name } });
    return NextResponse.json(existing);
  } catch (err) {
    const isDup = err instanceof Error && "code" in err && (err as { code?: number }).code === 11000;
    return NextResponse.json(
      { error: isDup ? "Nama kategori sudah dipakai" : err instanceof Error ? err.message : "Gagal mengubah kategori" },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/categories/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  await Category.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
