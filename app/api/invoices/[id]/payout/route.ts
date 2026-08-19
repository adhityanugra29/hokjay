import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { postCommissionPaid } from "@/lib/services/journal";

export async function PATCH(req: Request, ctx: RouteContext<"/api/invoices/[id]/payout">) {
  await dbConnect();
  const { id } = await ctx.params;
  const body = await req.json();

  const invoice = await Invoice.findById(id);
  if (!invoice) return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 });

  const wasCair = invoice.komisiCair;
  invoice.komisiCair = Boolean(body.komisiCair);
  invoice.komisiCairTanggal = invoice.komisiCair ? new Date() : undefined;
  await invoice.save();

  // Only post the payout journal on the false -> true transition, so
  // toggling it off and back on doesn't double-count.
  if (invoice.komisiCair && !wasCair) {
    await postCommissionPaid(invoice);
  }

  return NextResponse.json(invoice);
}
