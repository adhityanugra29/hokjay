import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { nextCustomerCode } from "@/lib/counters";

export async function GET(req: NextRequest) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();

  const filter: Record<string, unknown> = {};
  if (search) filter.nama = { $regex: search, $options: "i" };

  const customers = await Customer.find(filter).sort({ nama: 1 });
  return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();

  try {
    const kode = await nextCustomerCode();
    const customer = await Customer.create({
      kode,
      nama: body.nama,
      namaToko: body.namaToko,
      jenisUsaha: body.jenisUsaha,
      whatsapp: body.whatsapp,
      email: body.email || undefined,
      alamat: body.alamat,
      kota: body.kota || undefined,
      termHari: body.termHari !== undefined && body.termHari !== "" ? Number(body.termHari) : undefined,
      catatan: body.catatan || undefined,
    });
    return NextResponse.json(customer, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat pelanggan" },
      { status: 400 }
    );
  }
}
