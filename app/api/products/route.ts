import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { nextProductSku } from "@/lib/counters";
import { getProductInvoiceStatusMap, getKategoriKomisiBekasMap } from "@/lib/katalog";
import { resolveKomisiBekasPercent } from "@/lib/commission";

export async function GET(req: NextRequest) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();
  const category = searchParams.get("category")?.trim();
  // Opt-in — the Katalog PDF (CatalogPrintDoc.tsx) fetches this same route
  // and has no use for Booked/Sudah DP/SOLD, so the extra aggregation only
  // runs when a caller actually asks for it (the Invoice "Tambah Produk"
  // sidebar, see components/invoice/AddProductSidebar.tsx). Per the user's
  // request 2026-08-27.
  const withStatus = searchParams.get("withStatus") === "1";
  // The invoice currently being edited (see AddProductSidebar.tsx) — its
  // own qty shouldn't count as a "Booked" claim against itself. See
  // lib/katalog.ts's getProductInvoiceStatusMap doc comment.
  const excludeInvoiceId = searchParams.get("excludeInvoiceId")?.trim() || undefined;

  const filter: Record<string, unknown> = {};
  if (category) filter.category = category;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
      { merk: { $regex: search, $options: "i" } },
    ];
  }

  const products = await Product.find(filter).sort({ name: 1 }).lean();
  if (!withStatus) return NextResponse.json(products);

  const [statusMap, kategoriKomisiBekasMap] = await Promise.all([
    getProductInvoiceStatusMap(excludeInvoiceId),
    getKategoriKomisiBekasMap(),
  ]);
  const withStatusFields = products.map((p) => {
    const status = statusMap.get(String(p._id));
    return {
      ...p,
      bookedQty: status?.bookedQty ?? 0,
      bookedBy: status?.bookedBy ?? [],
      dpQty: status?.dpQty ?? 0,
      dpBy: status?.dpBy ?? [],
      soldQty: status?.soldQty ?? 0,
      // Effective barang-bekas commission rate — resolved server-side, see
      // resolveKomisiBekasPercent(). Powers AddProductSidebar's live
      // commission preview. Per the user's request 2026-09-03.
      komisiBekasPercent: resolveKomisiBekasPercent(p.komisiBekasPercent, kategoriKomisiBekasMap.get(p.category)),
    };
  });
  return NextResponse.json(withStatusFields);
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
