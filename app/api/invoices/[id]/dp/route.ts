import { NextResponse } from "next/server";
import { receiveDp } from "@/lib/services/receiveDp";

export async function POST(req: Request, ctx: RouteContext<"/api/invoices/[id]/dp">) {
  const { id } = await ctx.params;
  const body = await req.json();
  try {
    const invoice = await receiveDp(id, body);
    return NextResponse.json(invoice);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal mencatat DP" }, { status: 400 });
  }
}
