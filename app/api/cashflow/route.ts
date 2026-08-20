import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { CashflowEntry } from "@/models/CashflowEntry";
import { recordCashflow } from "@/lib/services/recordCashflow";

export async function GET(req: NextRequest) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? 200);
  const entries = await CashflowEntry.find().sort({ tanggal: -1 }).limit(limit);
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const entry = await recordCashflow({
      tipe: body.tipe === "masuk" ? "masuk" : "keluar",
      keterangan: body.keterangan,
      kategori: body.kategori,
      akunKode: body.akunKode,
      referensi: body.referensi,
      nominal: Number(body.nominal),
      tanggal: body.tanggal,
      productId: body.productId,
      buktiUrl: body.buktiUrl,
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mencatat transaksi" },
      { status: 400 }
    );
  }
}
