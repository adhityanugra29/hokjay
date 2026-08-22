import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Supplier } from "@/models/Supplier";

export async function PATCH(req: Request, ctx: RouteContext<"/api/suppliers/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  const body = await req.json();

  const supplier = await Supplier.findById(id);
  if (!supplier) return NextResponse.json({ error: "Supplier tidak ditemukan" }, { status: 404 });

  if (body.namaUsaha !== undefined) supplier.namaUsaha = body.namaUsaha.trim();
  if (body.alamat !== undefined) supplier.alamat = body.alamat.trim();
  if (body.bank !== undefined) supplier.bank = body.bank.trim();
  if (body.nomorRekening !== undefined) supplier.nomorRekening = body.nomorRekening.trim();
  if (body.kontak !== undefined) supplier.kontak = body.kontak || undefined;
  if (body.catatan !== undefined) supplier.catatan = body.catatan || undefined;

  await supplier.save();
  return NextResponse.json(supplier);
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/suppliers/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  await Supplier.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
