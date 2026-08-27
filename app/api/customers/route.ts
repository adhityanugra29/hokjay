import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { nextCustomerCode } from "@/lib/counters";
import { getSession } from "@/lib/auth/session";
import { customerVisibilityFilter } from "@/lib/pelanggan";

export async function GET(req: NextRequest) {
  await dbConnect();
  const session = await getSession();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();

  // Per-sales customer privacy (2026-08-27) — a plain "sales" role only
  // sees customers they personally added (or ones with no owner at all);
  // Manager/Admin/Owner/Super Admin see everyone, same as the /pelanggan
  // page itself. This is the same customer picker InlineCustomerForm uses
  // during invoice creation, so it has to respect the same scoping or a
  // sales rep could still browse other reps' customers from there.
  const filter: Record<string, unknown> = customerVisibilityFilter(session);
  if (search) filter.nama = { $regex: search, $options: "i" };

  const customers = await Customer.find(filter).sort({ nama: 1 });
  return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const session = await getSession();
  const body = await req.json();

  try {
    const kode = await nextCustomerCode(body.kota);
    const customer = await Customer.create({
      kode,
      nama: body.nama,
      namaToko: body.namaToko,
      jenisUsaha: body.jenisUsaha,
      whatsapp: body.whatsapp,
      email: body.email || undefined,
      alamat: body.alamat,
      kota: body.kota || undefined,
      provinsi: body.provinsi || undefined,
      termHari: body.termHari !== undefined && body.termHari !== "" ? Number(body.termHari) : undefined,
      catatan: body.catatan || undefined,
      // Only a plain "sales" account gets ownership recorded — Manager/
      // Admin/Owner/etc. see every customer regardless, so there's no
      // "own" customer list for them to need this for, and a stray value
      // here would just be dead weight. Per the user's request 2026-08-27.
      assignedSales: session?.role === "sales" ? session.nama : undefined,
    });
    return NextResponse.json(customer, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat pelanggan" },
      { status: 400 }
    );
  }
}
