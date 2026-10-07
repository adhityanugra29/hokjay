import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Jasa } from "@/models/Jasa";
import { nextJasaCode } from "@/lib/counters";

export async function GET(req: NextRequest) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  // The invoice "Tambah Jasa" picker only wants active ones.
  const onlyAktif = searchParams.get("aktif") === "1";
  const jasa = await Jasa.find(onlyAktif ? { aktif: true } : {}).sort({ nama: 1 }).lean();
  return NextResponse.json(jasa);
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();
  try {
    const jasa = await Jasa.create({
      nama: body.nama,
      kode: body.kode?.trim() || (await nextJasaCode()),
      aktif: body.aktif ?? true,
    });
    return NextResponse.json(jasa, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat jasa" },
      { status: 400 }
    );
  }
}
