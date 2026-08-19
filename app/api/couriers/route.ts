import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Courier } from "@/models/Courier";

export async function GET() {
  await dbConnect();
  const couriers = await Courier.find().sort({ name: 1 });
  return NextResponse.json(couriers);
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();
  try {
    const courier = await Courier.create({ name: String(body.name).trim(), cost: Number(body.cost) || 0 });
    return NextResponse.json(courier, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menambah kurir" },
      { status: 400 }
    );
  }
}
