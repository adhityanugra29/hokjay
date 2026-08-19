import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Category } from "@/models/Category";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/categories/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  await Category.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
