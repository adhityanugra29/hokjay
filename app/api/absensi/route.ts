import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Absensi } from "@/models/Absensi";
import { Karyawan } from "@/models/Karyawan";
import { getSession } from "@/lib/auth/session";

/** Daily attendance — Admin marks who was hadir; see models/Absensi.ts. */
export async function GET(req: NextRequest) {
  await dbConnect();
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Hanya Admin yang bisa mengakses absensi" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const tanggalStr = searchParams.get("tanggal");
  if (!tanggalStr) return NextResponse.json({ error: "Parameter tanggal wajib diisi" }, { status: 400 });

  const day = new Date(tanggalStr);
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const rows = await Absensi.find({ tanggal: { $gte: start, $lt: end } });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  await dbConnect();
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Hanya Admin yang bisa mencatat absensi" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.karyawanId || !body.tanggal) {
    return NextResponse.json({ error: "karyawanId dan tanggal wajib diisi" }, { status: 400 });
  }

  const karyawan = await Karyawan.findById(body.karyawanId);
  if (!karyawan) return NextResponse.json({ error: "Karyawan tidak ditemukan" }, { status: 404 });

  const day = new Date(body.tanggal);
  const tanggal = new Date(day.getFullYear(), day.getMonth(), day.getDate());

  try {
    const row = await Absensi.create({
      karyawan: karyawan._id,
      karyawanNama: karyawan.nama,
      tanggal,
      dicatatOleh: session.nama,
    });
    return NextResponse.json(row, { status: 201 });
  } catch (err: unknown) {
    // Already marked hadir today — idempotent, just return the existing row.
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      const existing = await Absensi.findOne({ karyawan: karyawan._id, tanggal });
      return NextResponse.json(existing);
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mencatat absensi" },
      { status: 400 }
    );
  }
}
