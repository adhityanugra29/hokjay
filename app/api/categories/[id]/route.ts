import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";

/**
 * Renames a category — per the user's request 2026-08-27 ("di kelola
 * kategori bisa hapus dan edit ya"), Hapus already existed but there was no
 * way to rename one. Product.category is a plain string snapshot, not a
 * reference to this Category document, so a rename here has to cascade to
 * every Product currently carrying the old name — otherwise those products
 * would silently fall out of the Katalog category filter, Inventory
 * grouping, and the Katalog PDF's "Daftar Isi Katalog" the moment the name
 * changed, without dropping their category outright.
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
  const oldName = existing.name;
  if (oldName === name) return NextResponse.json(existing);

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
