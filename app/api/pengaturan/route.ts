import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Pengaturan } from "@/models/Pengaturan";
import { postKasAwal } from "@/lib/services/journal";

export async function GET() {
  await dbConnect();
  const doc = (await Pengaturan.findById("singleton")) ?? (await Pengaturan.create({ _id: "singleton" }));
  return NextResponse.json(doc);
}

export async function PUT(req: NextRequest) {
  await dbConnect();
  const body = await req.json();
  const kasAwal = Number(body.kasAwal ?? 0);
  const kasAwalTanggal = body.kasAwalTanggal ? new Date(body.kasAwalTanggal) : new Date();

  if (kasAwal < 0) {
    return NextResponse.json({ error: "Kas awal tidak boleh negatif" }, { status: 400 });
  }

  try {
    const doc = await Pengaturan.findByIdAndUpdate(
      "singleton",
      { kasAwal, kasAwalTanggal },
      { upsert: true, new: true }
    );
    await postKasAwal(kasAwal, kasAwalTanggal);
    return NextResponse.json(doc);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menyimpan pengaturan" },
      { status: 400 }
    );
  }
}
