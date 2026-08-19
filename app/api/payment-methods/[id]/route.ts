import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { PaymentMethod } from "@/models/PaymentMethod";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/payment-methods/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  await PaymentMethod.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
