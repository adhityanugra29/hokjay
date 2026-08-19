import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { PaymentMethod } from "@/models/PaymentMethod";

export async function GET() {
  await dbConnect();
  const methods = await PaymentMethod.find().sort({ name: 1 });
  return NextResponse.json(methods);
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();
  try {
    const method = await PaymentMethod.create({ name: String(body.name).trim() });
    return NextResponse.json(method, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menambah metode pembayaran" },
      { status: 400 }
    );
  }
}
