import { NextResponse } from "next/server";
import { restockProduct } from "@/lib/services/restockProduct";

export async function POST(req: Request, ctx: RouteContext<"/api/products/[id]/restock">) {
  const { id } = await ctx.params;
  const body = await req.json();
  try {
    const product = await restockProduct(id, Number(body.qty), body.catatan);
    return NextResponse.json(product);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menambah stok" },
      { status: 400 }
    );
  }
}
