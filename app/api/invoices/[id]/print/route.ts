import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Sales } from "@/models/Sales";
import { Pengaturan } from "@/models/Pengaturan";
import { getSession } from "@/lib/auth/session";
import { isInvoiceBlockedForSession } from "@/lib/invoice-visibility";
import { buildInvoicePrintData } from "@/lib/invoiceDisplay";

/**
 * InvoicePrintData for one invoice, as JSON — feeds InvoicePdfModal (the
 * invoice preview + "Unduh PDF" that opens when an invoice number is tapped
 * on Payroll's Komisi/Riwayat drawers). Same fields app/invoice/[id]/page.tsx
 * builds for its own InvoiceDocument/InvoicePrintDoc. Same per-sales privacy guard as
 * GET /api/invoices/[id].
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/invoices/[id]/print">) {
  await dbConnect();
  const { id } = await ctx.params;
  const session = await getSession();
  const invoice = await Invoice.findById(id);
  if (!invoice) return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 });
  if (isInvoiceBlockedForSession(session, invoice.sales?.nama)) {
    return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 });
  }

  const pengaturan = await Pengaturan.findById("singleton").lean();
  const salesDoc = invoice.sales?.ref ? await Sales.findById(invoice.sales.ref).lean() : null;

  const printData = buildInvoicePrintData(invoice, {
    salesNomorHp: salesDoc?.nomorHp ?? undefined,
    syaratKetentuanTemplate: pengaturan?.syaratKetentuan ?? undefined,
  });

  return NextResponse.json(printData);
}
