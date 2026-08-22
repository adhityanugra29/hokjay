import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Supplier } from "@/models/Supplier";

export async function GET() {
  await dbConnect();
  const suppliers = await Supplier.find().sort({ namaUsaha: 1 });
  return NextResponse.json(suppliers);
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();

  if (!body.namaUsaha?.trim()) return NextResponse.json({ error: "Nama usaha wajib diisi" }, { status: 400 });
  if (!body.alamat?.trim()) return NextResponse.json({ error: "Alamat wajib diisi" }, { status: 400 });
  if (!body.bank?.trim()) return NextResponse.json({ error: "Bank wajib diisi" }, { status: 400 });
  if (!body.nomorRekening?.trim()) return NextResponse.json({ error: "Nomor rekening wajib diisi" }, { status: 400 });

  try {
    const supplier = await Supplier.create({
      namaUsaha: body.namaUsaha.trim(),
      alamat: body.alamat.trim(),
      bank: body.bank.trim(),
      nomorRekening: body.nomorRekening.trim(),
      kontak: body.kontak || undefined,
      catatan: body.catatan || undefined,
    });
    return NextResponse.json(supplier, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menambah supplier" },
      { status: 400 }
    );
  }
}
