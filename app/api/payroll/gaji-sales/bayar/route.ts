import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Sales } from "@/models/Sales";
import { GajiPayment } from "@/models/GajiPayment";
import { getSession } from "@/lib/auth/session";
import { isPayrollAdminLevel } from "@/lib/auth/access";
import { recordCashflow } from "@/lib/services/recordCashflow";

/**
 * Batch gaji-pokok payout for one or more "tetap" sales, one period at a
 * time — mirrors /api/insentif/bayar's batch shape. Double-payment for the
 * same (sales, periode) is prevented by GajiPayment's unique index; a
 * duplicate-key error here just means someone already paid it, so it's
 * skipped rather than surfaced as a hard failure (same tolerance as the
 * atomic status-guard pattern used elsewhere in this app).
 */
export async function POST(req: Request) {
  await dbConnect();
  const session = await getSession();
  if (!session || !isPayrollAdminLevel(session.role)) {
    return NextResponse.json({ error: "Hanya Admin yang bisa membayar gaji" }, { status: 403 });
  }

  const body = await req.json();
  const salesIds: string[] = Array.isArray(body.salesIds) ? body.salesIds : [];
  const periode: string = body.periode;
  if (salesIds.length === 0) return NextResponse.json({ error: "Pilih minimal 1 sales" }, { status: 400 });
  if (!periode) return NextResponse.json({ error: "Periode wajib diisi" }, { status: 400 });

  const tanggal = body.tanggal ? new Date(body.tanggal) : new Date();
  const buktiUrl = body.buktiUrl || undefined;
  const catatan = body.catatan || undefined;

  let paidCount = 0;
  let totalDibayar = 0;
  for (const salesId of salesIds) {
    const sales = await Sales.findById(salesId);
    if (!sales || sales.statusKepegawaian !== "tetap" || !sales.gajiPokok) continue;

    try {
      await GajiPayment.create({
        tipe: "gaji-sales",
        sales: sales._id,
        penerimaNama: sales.nama,
        periode,
        gajiPokok: sales.gajiPokok,
        totalGaji: sales.gajiPokok,
        tanggalBayar: tanggal,
        buktiTransferUrl: buktiUrl,
        catatan,
        dibayarOleh: session.nama,
      });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === 11000) continue; // already paid
      throw err;
    }

    await recordCashflow({
      tipe: "keluar",
      keterangan: `Gaji pokok ${sales.nama} — periode ${periode}`,
      kategori: "Gaji",
      akunKode: "6-2100",
      referensi: periode,
      nominal: sales.gajiPokok,
      tanggal,
      buktiUrl,
    });

    paidCount++;
    totalDibayar += sales.gajiPokok;
  }

  return NextResponse.json({ paidCount, totalDibayar });
}
