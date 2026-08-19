import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Courier } from "@/models/Courier";

export async function PATCH(req: Request, ctx: RouteContext<"/api/couriers/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  const body = await req.json();
  const courier = await Courier.findById(id);
  if (!courier) return NextResponse.json({ error: "Kurir tidak ditemukan" }, { status: 404 });
  if (body.name !== undefined) courier.name = String(body.name).trim();
  if (body.cost !== undefined) courier.cost = Number(body.cost) || 0;
  await courier.save();
  return NextResponse.json(courier);
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/couriers/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  await Courier.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
