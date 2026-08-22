import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { PurchaseBill } from "@/models/PurchaseBill";
import { recordCashflow } from "@/lib/services/recordCashflow";
import { getSession } from "@/lib/auth/session";

/**
 * Finance pays a purchasing bill — posts a normal "Pembelian Stok" cashflow
 * entry (account 1300, Persediaan Barang Dagang) via the same
 * recordCashflow() helper the manual stock-purchase expense form uses, so
 * this reconciles into Keuangan/Akuntansi exactly like any other stock
 * purchase. Atomic findOneAndUpdate with status:"belum_dibayar" baked into
 * the filter — same pattern as /api/insentif/bayar's double-post fix — so
 * a double-click or retried request can't post the cashflow/journal twice.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/purchase-bills/[id]/pay">) {
  await dbConnect();
  const { id } = await ctx.params;
  const body = await req.json();
  const session = await getSession();

  const tanggal = body.tanggal ? new Date(body.tanggal) : new Date();
  const buktiUrl = body.buktiUrl || undefined;
  const catatan = body.catatan || undefined;

  const bill = await PurchaseBill.findOneAndUpdate(
    { _id: id, status: "belum_dibayar" },
    {
      status: "dibayar",
      dibayarTanggal: tanggal,
      dibayarBuktiUrl: buktiUrl,
      dibayarCatatan: catatan,
      dibayarOleh: session?.nama,
    }
  );
  if (!bill) {
    return NextResponse.json({ error: "Tagihan tidak ditemukan atau sudah dibayar" }, { status: 400 });
  }

  await recordCashflow({
    tipe: "keluar",
    keterangan: `Pembayaran tagihan ${bill.nomor} — ${bill.namaBarang} (${bill.supplier})`,
    kategori: "Pembelian Stok",
    akunKode: "1300",
    referensi: bill.nomor,
    nominal: bill.totalTagihan,
    tanggal,
    buktiUrl,
  });

  return NextResponse.json({ ok: true });
}
