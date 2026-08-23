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
  if (body.bank !== undefined) sales.bank = body.bank || undefined;
  if (body.nomorRekening !== undefined) sales.nomorRekening = body.nomorRekening || undefined;
  if (typeof body.rekeningTerverifikasi === "boolean") sales.rekeningTerverifikasi = body.rekeningTerverifikasi;
  if (body.statusKepegawaian === "tetap" || body.statusKepegawaian === "freelance") {
    sales.statusKepegawaian = body.statusKepegawaian;
  }
  if (body.gajiPokok !== undefined) sales.gajiPokok = Number(body.gajiPokok) || 0;
  await sales.save();

  return NextResponse.json(sales);
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/sales/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  await Sales.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
