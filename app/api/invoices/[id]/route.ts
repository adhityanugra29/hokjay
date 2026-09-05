import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { updateInvoice } from "@/lib/services/updateInvoice";
import { deleteInvoice } from "@/lib/services/deleteInvoice";
import type { CreateInvoiceInput } from "@/lib/services/createInvoice";
import { getSession } from "@/lib/auth/session";
import { isInvoiceBlockedForSession } from "@/lib/invoice-visibility";

export async function GET(_req: Request, ctx: RouteContext<"/api/invoices/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  const session = await getSession();
  const invoice = await Invoice.findById(id);
  if (!invoice) return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 });
  // Per-sales invoice privacy — per the user's request 2026-08-29.
  if (isInvoiceBlockedForSession(session, invoice.sales?.nama)) {
    return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json(invoice);
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/invoices/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  const session = await getSession();
  const invoice = await Invoice.findById(id);
  if (!invoice) return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 });
  if (isInvoiceBlockedForSession(session, invoice.sales?.nama)) {
    return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 });
  }
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
  await dbConnect();
  const { id } = await ctx.params;
  const session = await getSession();
  const existing = await Invoice.findById(id);
  if (!existing) return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 });
  if (isInvoiceBlockedForSession(session, existing.sales?.nama)) {
    return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 });
  }
  const body: CreateInvoiceInput = await req.json();
  try {
    // Owner-only "no plafon diskon" override — see app/api/invoices/route.ts's matching comment.
    const invoice = await updateInvoice(id, body, { isOwner: session?.role === "owner" });
    return NextResponse.json(invoice);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengubah invoice" },
      { status: 400 }
    );
  }
}
