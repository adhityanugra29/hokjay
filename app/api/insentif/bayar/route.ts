import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { postCommissionPaid } from "@/lib/services/journal";

/**
 * Batch commission payout for one sales — pays every selected invoice's
 * commission in one action, sharing the same proof-of-transfer/tanggal/
 * catatan across all of them (see /insentif/bayar/[nama]).
 */
export async function POST(req: Request) {
  await dbConnect();
  const body = await req.json();
  const invoiceIds: string[] = Array.isArray(body.invoiceIds) ? body.invoiceIds : [];

  if (invoiceIds.length === 0) {
    return NextResponse.json({ error: "Pilih minimal 1 invoice untuk dibayar" }, { status: 400 });
  }

  const tanggal = body.tanggal ? new Date(body.tanggal) : new Date();
  const buktiUrl = body.buktiUrl || undefined;
  const catatan = body.catatan || undefined;

  let paidCount = 0;
  let totalKomisi = 0;
  for (const invoiceId of invoiceIds) {
    // Atomic find-and-update with komisiCair:false baked into the filter —
    // if this same invoice is submitted twice (double-click, a retried
    // request, two batches overlapping), only the first one that actually
    // flips false->true gets a match back; the second finds nothing to
    // update and is skipped, so the payout journal never posts twice.
    const invoice = await Invoice.findOneAndUpdate(
      { _id: invoiceId, status: "paid", komisiCair: false },
      { komisiCair: true, komisiCairTanggal: tanggal, komisiCairBuktiUrl: buktiUrl, komisiCairCatatan: catatan }
    );
    if (!invoice) continue;

    await postCommissionPaid(invoice, tanggal);
    paidCount++;
    totalKomisi += invoice.items.reduce((s: number, i: { komisiSubtotal: number }) => s + i.komisiSubtotal, 0);
  }

  return NextResponse.json({ paidCount, totalKomisi });
}
