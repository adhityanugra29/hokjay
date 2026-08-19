import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { ShippingZone } from "@/models/ShippingZone";

export async function GET() {
  await dbConnect();
  const zones = await ShippingZone.find().sort({ cost: 1 });
  return NextResponse.json(zones);
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();
  try {
    const zone = await ShippingZone.create({ name: String(body.name).trim(), cost: Number(body.cost) || 0 });
    return NextResponse.json(zone, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menambah zona pengiriman" },
      { status: 400 }
    );
  }
}
