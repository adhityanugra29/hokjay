import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { ShippingZone } from "@/models/ShippingZone";

export async function PATCH(req: Request, ctx: RouteContext<"/api/shipping-zones/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  const body = await req.json();
  const zone = await ShippingZone.findById(id);
  if (!zone) return NextResponse.json({ error: "Zona tidak ditemukan" }, { status: 404 });
  if (body.name !== undefined) zone.name = String(body.name).trim();
  if (body.cost !== undefined) zone.cost = Number(body.cost) || 0;
  await zone.save();
  return NextResponse.json(zone);
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/shipping-zones/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  await ShippingZone.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
