import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { OfficeExpenseRequest, OFFICE_EXPENSE_KATEGORI } from "@/models/OfficeExpenseRequest";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const requests = await OfficeExpenseRequest.find(filter).sort({ createdAt: -1 });
  return NextResponse.json(requests);
}

/** Anyone logged in can raise a request — approval (admin-only) is what actually gates spending. */
export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();
  const session = await getSession();

  if (!body.nama?.trim()) return NextResponse.json({ error: "Nama kebutuhan wajib diisi" }, { status: 400 });
  if (!OFFICE_EXPENSE_KATEGORI.includes(body.kategori)) {
    return NextResponse.json({ error: "Kategori wajib dipilih" }, { status: 400 });
  }
  const jumlah = Number(body.jumlah) || 0;
  if (jumlah <= 0) return NextResponse.json({ error: "Jumlah harus lebih dari 0" }, { status: 400 });

  try {
    const request = await OfficeExpenseRequest.create({
      nama: body.nama.trim(),
      kategori: body.kategori,
      jumlah,
      alasan: body.alasan || undefined,
      diajukanOleh: session?.nama,
    });
    return NextResponse.json(request, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat request" },
      { status: 400 }
    );
  }
}
