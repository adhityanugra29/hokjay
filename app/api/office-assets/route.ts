import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { OfficeAsset, OFFICE_ASSET_KATEGORI } from "@/models/OfficeAsset";
import { PurchaseBill } from "@/models/PurchaseBill";
import { nextAssetCode } from "@/lib/counters";

export async function GET(req: NextRequest) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const kategori = searchParams.get("kategori");

  const filter: Record<string, unknown> = {};
  if (kategori) filter.kategori = kategori;

  const assets = await OfficeAsset.find(filter).sort({ createdAt: -1 });
  return NextResponse.json(assets);
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();

  if (!body.nama?.trim()) return NextResponse.json({ error: "Nama barang wajib diisi" }, { status: 400 });
  if (!OFFICE_ASSET_KATEGORI.includes(body.kategori)) {
    return NextResponse.json({ error: "Kategori wajib dipilih (Peralatan atau Habis Pakai)" }, { status: 400 });
  }

  let sumberBillNomor: string | undefined;
  if (body.sumberBill) {
    const bill = await PurchaseBill.findById(body.sumberBill);
    if (!bill) return NextResponse.json({ error: "Tagihan pembelian tidak ditemukan" }, { status: 400 });
    sumberBillNomor = bill.nomor;
  }

  try {
    const kodeAset = await nextAssetCode();
    const asset = await OfficeAsset.create({
      kodeAset,
      nama: body.nama.trim(),
      kategori: body.kategori,
      qty: Number(body.qty) || 1,
      satuan: body.satuan || undefined,
      pemegang: body.pemegang || undefined,
      lokasi: body.lokasi || undefined,
      kondisi: body.kondisi || undefined,
      hargaPerolehan: body.hargaPerolehan !== undefined && body.hargaPerolehan !== "" ? Number(body.hargaPerolehan) : undefined,
      tanggalPerolehan: body.tanggalPerolehan ? new Date(body.tanggalPerolehan) : undefined,
      umurEkonomisBulan: body.umurEkonomisBulan ? Number(body.umurEkonomisBulan) : undefined,
      sumberBill: body.sumberBill || undefined,
      sumberBillNomor,
      catatan: body.catatan || undefined,
    });

    if (body.sumberBill) {
      await PurchaseBill.findByIdAndUpdate(body.sumberBill, { dicatatSebagaiAset: true });
    }

    return NextResponse.json(asset, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menambah aset" },
      { status: 400 }
    );
  }
}
