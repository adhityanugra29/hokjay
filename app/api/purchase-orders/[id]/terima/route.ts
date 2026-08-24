import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { PurchaseOrder } from "@/models/PurchaseOrder";
import { PurchaseBill } from "@/models/PurchaseBill";
import { Product } from "@/models/Product";
import { nextPurchaseBillCode } from "@/lib/counters";
import { getSession } from "@/lib/auth/session";

const DEFAULT_JATUH_TEMPO_DAYS = 14;

/**
 * Marks a PO as received: bumps stock for every item, then auto-creates one
 * PurchaseBill per item (PurchaseBill stays single-line — see
 * models/PurchaseOrder.ts's doc comment) so it shows up in Bayar Tagihan.
 * Atomic status guard (menunggu -> diterima) — same double-post prevention
 * pattern used across this app's other status transitions.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/purchase-orders/[id]/terima">) {
  await dbConnect();
  const { id } = await ctx.params;
  const session = await getSession();
  const body = await req.json().catch(() => ({}));

  const tanggalDiterima = new Date();
  const po = await PurchaseOrder.findOneAndUpdate(
    { _id: id, status: "menunggu" },
    { status: "diterima", tanggalDiterima }
  );
  if (!po) {
    return NextResponse.json({ error: "PO tidak ditemukan atau sudah diproses" }, { status: 400 });
  }

  const jatuhTempo = new Date(tanggalDiterima.getTime() + DEFAULT_JATUH_TEMPO_DAYS * 86_400_000);
  const billIds: string[] = [];

  for (const item of po.items) {
    await Product.findByIdAndUpdate(item.product, { $inc: { stok: item.qty } });

    const nomor = await nextPurchaseBillCode();
    const bill = await PurchaseBill.create({
      nomor,
      purchaseOrder: po._id,
      namaBarang: item.namaSnapshot,
      qty: item.qty,
      supplierRef: po.supplierRef,
      supplier: po.supplier,
      supplierAlamat: po.supplierAlamat,
      supplierBank: po.supplierBank,
      supplierNomorRekening: po.supplierNomorRekening,
      hargaSatuan: item.hargaSatuan,
      jatuhTempo,
      catatan: `Dari PO ${po.nomor}${body.catatan ? ` — ${body.catatan}` : ""}`,
      dibuatOleh: session?.nama,
    });
    po.bills.push(bill._id);
    billIds.push(String(bill._id));
  }

  await po.save();

  return NextResponse.json({ ok: true, billIds });
}
