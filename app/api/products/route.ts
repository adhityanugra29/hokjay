import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { nextProductSku } from "@/lib/counters";

export async function GET(req: NextRequest) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();
  const category = searchParams.get("category")?.trim();

  const filter: Record<string, unknown> = {};
  if (category) filter.category = category;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
      { merk: { $regex: search, $options: "i" } },
    ];
  }

  const products = await Product.find(filter).sort({ name: 1 });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();

  try {
    const sku = body.sku?.trim() || (await nextProductSku(body.category));
    const product = await Product.create({
      name: body.name,
      merk: body.merk || undefined,
      sku,
      category: body.category,
      kondisi: body.kondisi || "baru",
      kondisiPercent: body.kondisiPercent || undefined,
      tipeProduk: body.tipeProduk || "non-elektronik",
      hargaBeli: Number(body.hargaBeli ?? 0),
      hargaRekomendasi: Number(body.hargaRekomendasi),
      hargaMinimum: Number(body.hargaMinimum),
      komisiPercent: Number(body.komisiPercent ?? 5),
      stok: Number(body.stok ?? 0),
      tanggalBarangMasuk: body.tanggalBarangMasuk ? new Date(body.tanggalBarangMasuk) : undefined,
      stokMinimum: body.stokMinimum !== undefined ? Number(body.stokMinimum) : undefined,
      alertHariTidakTerjual: body.alertHariTidakTerjual ? Number(body.alertHariTidakTerjual) : undefined,
      dimensi: body.dimensi,
      ketebalan: body.ketebalan,
      dayaListrik: body.dayaListrik,
      fotoUrl: body.fotoUrl,
      fotoSampingUrl: body.fotoSampingUrl,
      fotoBelakangUrl: body.fotoBelakangUrl,
      deskripsi: body.deskripsi,
    });
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat produk" },
      { status: 400 }
    );
  }
}
