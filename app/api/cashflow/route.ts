import { NextRequest, NextResponse } from "next/server";
import { recordCashflow } from "@/lib/services/recordCashflow";

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
