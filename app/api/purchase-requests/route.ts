import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { PurchaseRequest } from "@/models/PurchaseRequest";
import { nextPurchaseRequestCode } from "@/lib/counters";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const requests = await PurchaseRequest.find(filter).sort({ createdAt: -1 });
  return NextResponse.json(requests);
}

/**
 * Raised either from Katalog's "Request Produk PO" (Sales, sumber: "sales",
 * tied to a customer) or from Purchasing's own "+ Request Baru" (sumber:
 * "purchasing", e.g. a general restock need with no specific customer).
 */
export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();
  const session = await getSession();

  if (!body.namaBarang?.trim()) {
    return NextResponse.json({ error: "Nama barang wajib diisi" }, { status: 400 });
  }
  if (body.sumber !== "sales" && body.sumber !== "purchasing") {
    return NextResponse.json({ error: "Sumber request tidak valid" }, { status: 400 });
  }

  try {
    const nomor = await nextPurchaseRequestCode();
    const request = await PurchaseRequest.create({
      nomor,
      namaBarang: body.namaBarang.trim(),
      deskripsi: body.deskripsi || undefined,
      qty: Number(body.qty) || 1,
      sumber: body.sumber,
      customer: body.customerId ? { ref: body.customerId, nama: body.customerNama } : undefined,
      sales: body.salesId ? { ref: body.salesId, nama: body.salesNama } : undefined,
      diajukanOleh: session?.nama,
      catatan: body.catatan || undefined,
    });
    return NextResponse.json(request, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat request pembelian" },
      { status: 400 }
    );
  }
}
