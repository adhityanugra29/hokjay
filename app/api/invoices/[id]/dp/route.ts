import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { receiveDp } from "@/lib/services/receiveDp";
import { getSession } from "@/lib/auth/session";
import { isInvoiceBlockedForSession } from "@/lib/invoice-visibility";

export async function POST(req: Request, ctx: RouteContext<"/api/invoices/[id]/dp">) {
  await dbConnect();
  const { id } = await ctx.params;
  const session = await getSession();
  const existing = await Invoice.findById(id);
  if (!existing) return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 });
  // Per-sales invoice privacy — per the user's request 2026-08-29.
  if (isInvoiceBlockedForSession(session, existing.sales?.nama)) {
    return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 });
  }
  const body = await req.json();
  try {
    const invoice = await receiveDp(id, body);
    return NextResponse.json(invoice);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal mencatat DP" }, { status: 400 });
  }
}
