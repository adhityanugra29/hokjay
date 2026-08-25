import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Karyawan } from "@/models/Karyawan";
import { Absensi } from "@/models/Absensi";
import { GajiPayment } from "@/models/GajiPayment";
import { getSession } from "@/lib/auth/session";
import { isPayrollAdminLevel } from "@/lib/auth/access";
import { recordCashflow } from "@/lib/services/recordCashflow";

function periodRange(periode: string) {
  const [y, m] = periode.split("-").map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
}

/** Batch gaji payout for one or more karyawan, computed from that period's Absensi count x gajiHarian. */
export async function POST(req: Request) {
  await dbConnect();
  const session = await getSession();
  if (!session || !isPayrollAdminLevel(session.role)) {
    return NextResponse.json({ error: "Hanya Admin yang bisa membayar gaji" }, { status: 403 });
  }

  const body = await req.json();
  const karyawanIds: string[] = Array.isArray(body.karyawanIds) ? body.karyawanIds : [];
  const periode: string = body.periode;
  if (karyawanIds.length === 0) return NextResponse.json({ error: "Pilih minimal 1 karyawan" }, { status: 400 });
  if (!periode) return NextResponse.json({ error: "Periode wajib diisi" }, { status: 400 });

  const { start, end } = periodRange(periode);
  const tanggal = body.tanggal ? new Date(body.tanggal) : new Date();
  const buktiUrl = body.buktiUrl || undefined;
  const catatan = body.catatan || undefined;

  let paidCount = 0;
  let totalDibayar = 0;
  for (const karyawanId of karyawanIds) {
    const karyawan = await Karyawan.findById(karyawanId);
    if (!karyawan) continue;

    const hariHadir = await Absensi.countDocuments({ karyawan: karyawan._id, tanggal: { $gte: start, $lt: end } });
    const totalGaji = hariHadir * karyawan.gajiHarian;
    if (totalGaji <= 0) continue;

    try {
      await GajiPayment.create({
        tipe: "gaji-karyawan",
        karyawan: karyawan._id,
        penerimaNama: karyawan.nama,
        periode,
        hariHadir,
        gajiHarianSnapshot: karyawan.gajiHarian,
        totalGaji,
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
      keterangan: `Gaji ${karyawan.nama} — ${hariHadir} hari kerja, periode ${periode}`,
      kategori: "Gaji",
      akunKode: "6-2100",
      referensi: periode,
      nominal: totalGaji,
      tanggal,
      buktiUrl,
    });

    paidCount++;
    totalDibayar += totalGaji;
  }

  return NextResponse.json({ paidCount, totalDibayar });
}
