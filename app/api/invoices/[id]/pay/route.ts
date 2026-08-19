import { NextResponse } from "next/server";
import { payInvoice } from "@/lib/services/payInvoice";

export async function POST(req: Request, ctx: RouteContext<"/api/invoices/[id]/pay">) {
  const { id } = await ctx.params;
  const body = await req.json();
  try {
    const invoice = await payInvoice(id, body);
    return NextResponse.json(invoice);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengonfirmasi pembayaran" },
      { status: 400 }
    );
  }
}
