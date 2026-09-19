import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { getSession } from "@/lib/auth/session";
import { isInvoiceBlockedForSession } from "@/lib/invoice-visibility";

/**
 * Marks (or un-marks) an invoice as physically shipped — independent of
 * payment status, per the user's request 2026-09-19 ("Tandai Sudah
 * Kirim"). Any payment status except draft can be marked (shipping can
 * happen before full payment, e.g. once DP'd). This is what lets an
 * invoice actually drop out of Beranda's "Perlu Dikirim" widget /
 * /follow-up?view=kirim (see lib/dashboard.ts's getShippingPriorityInvoices) —
 * before this endpoint existed there was no way to close that loop at all.
 */
export async function PATCH(req: Request, ctx: RouteContext<"/api/invoices/[id]/kirim">) {
  await dbConnect();
  const { id } = await ctx.params;
  const session = await getSession();
  const existing = await Invoice.findById(id);
  if (!existing) return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 });
  if (isInvoiceBlockedForSession(session, existing.sales?.nama)) {
    return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 });
  }
  if (existing.status === "draft") {
    return NextResponse.json({ error: "Invoice masih draft, belum bisa ditandai dikirim" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  // `dikirim: false` in the body undoes a mistaken click — same button
  // toggles back, no separate endpoint needed.
  const dikirim = body.dikirim !== false;

  existing.set(
    dikirim
      ? { dikirim: true, tanggalDikirimAktual: new Date(), dikirimOleh: session?.nama }
      : { dikirim: false, tanggalDikirimAktual: undefined, dikirimOleh: undefined }
  );
  await existing.save();
  return NextResponse.json(existing);
}
