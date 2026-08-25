import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Karyawan } from "@/models/Karyawan";
import { getSession } from "@/lib/auth/session";
import { isAdminLevel } from "@/lib/auth/access";

/** Karyawan (non-sales staff) roster — Admin-only, see models/Karyawan.ts. */
export async function GET() {
  await dbConnect();
  const session = await getSession();
  if (!isAdminLevel(session?.role)) {
    return NextResponse.json({ error: "Hanya Admin yang bisa mengakses data karyawan" }, { status: 403 });
  }
  const karyawan = await Karyawan.find().sort({ nama: 1 });
  return NextResponse.json(karyawan);
}

export async function POST(req: Request) {
  await dbConnect();
  const session = await getSession();
  if (!isAdminLevel(session?.role)) {
    return NextResponse.json({ error: "Hanya Admin yang bisa menambah karyawan" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.nama?.trim()) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
  if (!(Number(body.gajiHarian) > 0)) {
    return NextResponse.json({ error: "Gaji harian harus lebih dari 0" }, { status: 400 });
  }

  try {
    const karyawan = await Karyawan.create({
      nama: body.nama.trim(),
      jabatan: body.jabatan?.trim() || undefined,
      gajiHarian: Number(body.gajiHarian),
    });
    return NextResponse.json(karyawan, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menambah karyawan" },
      { status: 400 }
    );
  }
}
