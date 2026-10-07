import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Sales } from "@/models/Sales";
import { Pengaturan } from "@/models/Pengaturan";
import { getSession } from "@/lib/auth/session";
import { isInvoiceBlockedForSession } from "@/lib/invoice-visibility";
import type { InvoicePrintData } from "@/lib/invoiceDisplay";

/**
 * InvoicePrintData for one invoice, as JSON — feeds InvoicePdfModal (the
 * invoice preview + "Unduh PDF" that opens when an invoice number is tapped
 * on Payroll's Komisi/Riwayat drawers). Same fields app/invoice/[id]/page.tsx
 * builds for its own InvoiceDocument/InvoicePrintDoc; DP/payment bukti URLs
 * are left out, same as that page. Same per-sales privacy guard as
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

  const printData: InvoicePrintData = {
    nomor: invoice.nomor,
    tanggal: (invoice.tanggalInvoice ?? invoice.createdAt!).toISOString(),
    customerNama: invoice.customer!.nama,
    customerWhatsapp: invoice.customer!.whatsapp ?? undefined,
    shipAddress: invoice.shipAddress ?? undefined,
    tanggalKirim: invoice.tanggalKirim ? invoice.tanggalKirim.toISOString() : undefined,
    kurir: invoice.kurir ?? undefined,
    catatan: invoice.catatan ?? undefined,
    syaratKetentuan: pengaturan?.syaratKetentuan ?? undefined,
    salesNama: invoice.sales!.nama,
    salesNomorHp: salesDoc?.nomorHp ?? undefined,
    items: invoice.items.map((item) => ({
      namaSnapshot: item.namaSnapshot,
      dimensiSnapshot: item.dimensiSnapshot ?? undefined,
      qty: item.qty,
      hargaJual: item.hargaJual,
      diskonPerUnit: item.diskonPerUnit ?? 0,
      subtotal: item.subtotal,
      isFlashSale: item.isFlashSale ?? false,
      isJasa: item.isJasa ?? false,
      hargaRekomendasiSnapshot: item.hargaRekomendasiSnapshot ?? undefined,
    })),
    subtotalProduk: invoice.subtotalProduk,
    ongkosKirim: invoice.ongkosKirim ?? 0,
    grandTotal: invoice.grandTotal,
    dpNominal: invoice.dp?.nominal ?? undefined,
    dpTanggal: invoice.dp?.tanggal ? invoice.dp.tanggal.toISOString() : undefined,
    isPaid: invoice.status === "paid",
    paymentTanggalBayar: invoice.payment?.tanggalBayar ? invoice.payment.tanggalBayar.toISOString() : undefined,
    paymentNominalDiterima: invoice.payment?.nominalDiterima ?? undefined,
  };

  return NextResponse.json(printData);
}
