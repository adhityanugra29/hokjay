import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { CashflowEntry } from "@/models/CashflowEntry";
import { addExpense } from "@/lib/services/addExpense";

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
    const entry = await addExpense({
      keterangan: body.keterangan,
      kategori: body.kategori,
      referensi: body.referensi,
      nominal: Number(body.nominal),
      tanggal: body.tanggal,
      productId: body.productId,
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mencatat pengeluaran" },
      { status: 400 }
    );
  }
}
