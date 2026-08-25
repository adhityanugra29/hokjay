import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { updateInvoice } from "@/lib/services/updateInvoice";
import { deleteInvoice } from "@/lib/services/deleteInvoice";
import type { CreateInvoiceInput } from "@/lib/services/createInvoice";

export async function GET(_req: Request, ctx: RouteContext<"/api/invoices/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  const invoice = await Invoice.findById(id);
  if (!invoice) return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/invoices/[id]">) {
  const { id } = await ctx.params;
  try {
    await deleteInvoice(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menghapus invoice" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/invoices/[id]">) {
  const { id } = await ctx.params;
  const body: CreateInvoiceInput = await req.json();
  try {
    const invoice = await updateInvoice(id, body);
    return NextResponse.json(invoice);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengubah invoice" },
      { status: 400 }
    );
  }
}
