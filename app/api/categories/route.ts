import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Category } from "@/models/Category";

export async function GET() {
  await dbConnect();
  const categories = await Category.find().sort({ name: 1 });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();
  try {
    const category = await Category.create({ name: String(body.name).trim() });
    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menambah kategori" },
      { status: 400 }
    );
  }
}
