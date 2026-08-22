import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { PurchaseBill } from "@/models/PurchaseBill";
import { PurchaseRequest } from "@/models/PurchaseRequest";
import { Supplier } from "@/models/Supplier";
import { nextPurchaseBillCode } from "@/lib/counters";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const bills = await PurchaseBill.find(filter).sort({ createdAt: -1 });
  return NextResponse.json(bills);
}

/**
 * Purchasing creates this once they've sourced a supplier and know the
 * cost — optionally against an existing PurchaseRequest (which then flips
 * to status "dibeli" and gets linked back to this bill), or standalone.
 * This is what Finance later pays via /api/purchase-bills/[id]/pay.
 */
export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();
  const session = await getSession();

  if (!body.namaBarang?.trim()) return NextResponse.json({ error: "Nama barang wajib diisi" }, { status: 400 });
  if (!body.supplierId) return NextResponse.json({ error: "Supplier wajib dipilih" }, { status: 400 });
  const qty = Number(body.qty) || 0;
  const hargaSatuan = Number(body.hargaSatuan) || 0;
  if (qty <= 0) return NextResponse.json({ error: "Qty harus lebih dari 0" }, { status: 400 });
  if (hargaSatuan <= 0) return NextResponse.json({ error: "Harga satuan harus lebih dari 0" }, { status: 400 });

  const supplier = await Supplier.findById(body.supplierId);
  if (!supplier) return NextResponse.json({ error: "Supplier tidak ditemukan" }, { status: 400 });

  try {
    const nomor = await nextPurchaseBillCode();
    const bill = await PurchaseBill.create({
      nomor,
      request: body.requestId || undefined,
      namaBarang: body.namaBarang.trim(),
      qty,
      supplierRef: supplier._id,
      supplier: supplier.namaUsaha,
      supplierAlamat: supplier.alamat,
      supplierBank: supplier.bank,
      supplierNomorRekening: supplier.nomorRekening,
      hargaSatuan,
      jatuhTempo: body.jatuhTempo ? new Date(body.jatuhTempo) : undefined,
      catatan: body.catatan || undefined,
      buktiTagihanUrl: body.buktiTagihanUrl || undefined,
      dibuatOleh: session?.nama,
    });

    if (body.requestId) {
      await PurchaseRequest.findByIdAndUpdate(body.requestId, { status: "dibeli", bill: bill._id });
    }

    return NextResponse.json(bill, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat tagihan pembelian" },
      { status: 400 }
    );
  }
}
