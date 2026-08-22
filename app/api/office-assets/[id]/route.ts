import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { OfficeAsset, OFFICE_ASSET_KATEGORI, OFFICE_ASSET_KONDISI } from "@/models/OfficeAsset";

export async function PATCH(req: Request, ctx: RouteContext<"/api/office-assets/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  const body = await req.json();

  const asset = await OfficeAsset.findById(id);
  if (!asset) return NextResponse.json({ error: "Aset tidak ditemukan" }, { status: 404 });

  if (body.nama !== undefined) asset.nama = body.nama.trim();
  if (body.kategori !== undefined) {
    if (!OFFICE_ASSET_KATEGORI.includes(body.kategori)) {
      return NextResponse.json({ error: "Kategori tidak valid" }, { status: 400 });
    }
    asset.kategori = body.kategori;
  }
  if (body.qty !== undefined) asset.qty = Number(body.qty) || 1;
  if (body.satuan !== undefined) asset.satuan = body.satuan || undefined;
  if (body.lokasi !== undefined) asset.lokasi = body.lokasi || undefined;
  if (body.kondisi !== undefined) {
    if (!OFFICE_ASSET_KONDISI.includes(body.kondisi)) {
      return NextResponse.json({ error: "Kondisi tidak valid" }, { status: 400 });
    }
    asset.kondisi = body.kondisi;
  }
  if (body.hargaPerolehan !== undefined) {
    asset.hargaPerolehan = body.hargaPerolehan === "" ? undefined : Number(body.hargaPerolehan);
  }
  if (body.catatan !== undefined) asset.catatan = body.catatan || undefined;

  await asset.save();
  return NextResponse.json(asset);
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/office-assets/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  await OfficeAsset.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
