import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Sales } from "@/models/Sales";

export async function PATCH(req: Request, ctx: RouteContext<"/api/sales/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  const body = await req.json();

  const sales = await Sales.findById(id);
  if (!sales) return NextResponse.json({ error: "Sales tidak ditemukan" }, { status: 404 });

  if (typeof body.aktif === "boolean") sales.aktif = body.aktif;
  if (typeof body.nama === "string" && body.nama.trim()) sales.nama = body.nama.trim();
  await sales.save();

  return NextResponse.json(sales);
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/sales/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  await Sales.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
