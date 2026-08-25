import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { nextProductSku } from "@/lib/counters";
import { customOrderEstimate } from "@/lib/pricing";
import { CUSTOM_ORDER_CATEGORIES, type CustomOrderCategoryId } from "@/lib/constants";

const CUSTOM_CATEGORY_NAME = "Custom Order";

/**
 * Turns a "Pesan Produk Custom" submission into a real, one-off Product
 * (stok 1) so it shows up in the Katalog/Inventory like anything else and
 * can be added to / removed from an invoice with the same qty-stepper UI —
 * instead of being a phantom cart-only line item with no product behind it.
 * The price is always recomputed here from the formula, never trusted from
 * the client.
 */
export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();

  const categoryId = body.categoryId as CustomOrderCategoryId;
  const tier = CUSTOM_ORDER_CATEGORIES.find((c) => c.id === categoryId);
  if (!tier) return NextResponse.json({ error: "Kategori custom tidak valid" }, { status: 400 });

  const panjangCm = Number(body.panjangCm) || 0;
  const lebarCm = Number(body.lebarCm) || 0;
  const tinggiCm = Number(body.tinggiCm) || 0;
  const ketebalanMm = Number(body.ketebalanMm) || 0;
  const tingkat = Number(body.tingkat) || 1;

  const estimate = customOrderEstimate({ categoryId, panjangCm, lebarCm, tinggiCm, ketebalanMm, tingkat });
  if (estimate <= 0) {
    return NextResponse.json({ error: "Ukuran belum diisi, estimasi harga masih Rp 0" }, { status: 400 });
  }

  // Make sure the catch-all category exists so the product isn't left with
  // a dangling category string if it was never created (or was deleted).
  await Category.updateOne({ name: CUSTOM_CATEGORY_NAME }, { $setOnInsert: { name: CUSTOM_CATEGORY_NAME } }, { upsert: true });

  const dims = `${panjangCm}x${lebarCm}x${tinggiCm}cm`;
  const name = `Custom: ${tier.label} ${dims}`;
  const sku = await nextProductSku(CUSTOM_CATEGORY_NAME);

  const product = await Product.create({
    name,
    sku,
    category: CUSTOM_CATEGORY_NAME,
    kondisi: "baru",
    hargaBeli: 0,
    hargaRekomendasi: estimate,
    hargaMinimum: estimate,
    komisiPercent: 6, // matches the flat "barang baru/custom" commission rule
    stok: 1,
    dimensi: { panjangCm, lebarCm, tinggiCm },
    ketebalan: ketebalanMm ? `${ketebalanMm} mm` : undefined,
    deskripsi: body.notes || undefined,
    isCustom: true,
    rabUrl: body.rabUrl || undefined,
  });

  return NextResponse.json(product, { status: 201 });
}
