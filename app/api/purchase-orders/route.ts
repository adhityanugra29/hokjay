import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { PurchaseOrder } from "@/models/PurchaseOrder";
import { Supplier } from "@/models/Supplier";
import { Product } from "@/models/Product";
import { nextPurchaseOrderCode } from "@/lib/counters";
import { getSession } from "@/lib/auth/session";

interface ItemInput {
  productId: string;
  qty: number;
  hargaSatuan: number;
}

export async function POST(req: Request) {
  await dbConnect();
  const session = await getSession();
  const body = await req.json();

  const supplier = await Supplier.findById(body.supplierId);
  if (!supplier) return NextResponse.json({ error: "Pilih supplier" }, { status: 400 });

  const itemsInput: ItemInput[] = Array.isArray(body.items) ? body.items : [];
  if (itemsInput.length === 0) {
    return NextResponse.json({ error: "Minimal 1 barang di PO" }, { status: 400 });
  }

  const products = await Product.find({ _id: { $in: itemsInput.map((i) => i.productId) } }).lean();
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const items = itemsInput.map((i) => {
    const p = productMap.get(i.productId);
    if (!p) throw new Error("Produk tidak ditemukan");
    return {
      product: p._id,
      namaSnapshot: p.name,
      qty: Number(i.qty) || 1,
      hargaSatuan: Number(i.hargaSatuan) || 0,
      subtotal: (Number(i.qty) || 1) * (Number(i.hargaSatuan) || 0),
    };
  });

  try {
    const nomor = await nextPurchaseOrderCode();
    const po = await PurchaseOrder.create({
      nomor,
      supplierRef: supplier._id,
      supplier: supplier.namaUsaha,
      supplierAlamat: supplier.alamat,
      supplierBank: supplier.bank,
      supplierNomorRekening: supplier.nomorRekening,
      items,
      totalNilai: items.reduce((s, i) => s + i.subtotal, 0),
      tanggalEstimasi: body.tanggalEstimasi ? new Date(body.tanggalEstimasi) : undefined,
      catatan: body.catatan || undefined,
      dibuatOleh: session?.nama,
    });
    return NextResponse.json(po, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat PO" },
      { status: 400 }
    );
  }
}
