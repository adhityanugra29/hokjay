import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Courier } from "@/models/Courier";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/couriers/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  await Courier.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
