import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Sales } from "@/models/Sales";

export async function GET(req: NextRequest) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const filter: Record<string, unknown> = {};
  if (searchParams.get("aktif") === "true") filter.aktif = true;
  const sales = await Sales.find(filter).sort({ nama: 1 });
  return NextResponse.json(sales);
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();
  try {
    const sales = await Sales.create({ nama: body.nama, aktif: true });
    return NextResponse.json(sales, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menambah sales" },
      { status: 400 }
    );
  }
}
