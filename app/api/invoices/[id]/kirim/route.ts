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
 *
 * `tanggalDikirimAktual`/`kurir` (2026-09-19 follow-up) — the "Tandai
 * Sudah Kirim" click is now a small form (see TandaiKirimButton.tsx), not
 * a bare confirm(): the user picks the actual ship date (defaults today
 * client-side) and confirms/corrects the courier. A `kurir` that differs
 * from what's already on the invoice REPLACES `Invoice.kurir` itself —
 * not a separate "actual courier" field — so the next PDF/preview render
 * (InvoicePrintDoc.tsx/InvoiceDocument.tsx, both already read
 * invoice.kurir live) picks it up automatically with no PDF code change.
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

  if (dikirim) {
    const tanggalDikirimAktual = body.tanggalDikirimAktual ? new Date(body.tanggalDikirimAktual) : new Date();
    const kurir = typeof body.kurir === "string" && body.kurir.trim() ? body.kurir.trim() : undefined;
    existing.set({
      dikirim: true,
      tanggalDikirimAktual,
      dikirimOleh: session?.nama,
      ...(kurir ? { kurir } : {}),
    });
  } else {
    existing.set({ dikirim: false, tanggalDikirimAktual: undefined, dikirimOleh: undefined });
  }
  await existing.save();
  return NextResponse.json(existing);
}
