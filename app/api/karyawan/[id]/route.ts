import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Karyawan } from "@/models/Karyawan";
import { getSession } from "@/lib/auth/session";
import { isAdminLevel } from "@/lib/auth/access";

export async function PATCH(req: Request, ctx: RouteContext<"/api/karyawan/[id]">) {
  await dbConnect();
  const session = await getSession();
  if (!isAdminLevel(session?.role)) {
    return NextResponse.json({ error: "Hanya Admin yang bisa mengubah data karyawan" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = await req.json();

  const karyawan = await Karyawan.findById(id);
  if (!karyawan) return NextResponse.json({ error: "Karyawan tidak ditemukan" }, { status: 404 });

  if (typeof body.nama === "string" && body.nama.trim()) karyawan.nama = body.nama.trim();
  if (body.jabatan !== undefined) karyawan.jabatan = body.jabatan || undefined;
  if (body.gajiHarian !== undefined && Number(body.gajiHarian) > 0) karyawan.gajiHarian = Number(body.gajiHarian);
  if (typeof body.aktif === "boolean") karyawan.aktif = body.aktif;
  await karyawan.save();

  return NextResponse.json(karyawan);
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/karyawan/[id]">) {
  await dbConnect();
  const session = await getSession();
  if (!isAdminLevel(session?.role)) {
    return NextResponse.json({ error: "Hanya Admin yang bisa menghapus karyawan" }, { status: 403 });
  }
  const { id } = await ctx.params;
  await Karyawan.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
