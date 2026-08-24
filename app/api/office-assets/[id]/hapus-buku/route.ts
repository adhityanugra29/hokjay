import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { OfficeAsset } from "@/models/OfficeAsset";

/** Write off a broken/lost asset — book value pins to 0, drops out of "Perlu tindakan". */
export async function POST(req: Request, ctx: RouteContext<"/api/office-assets/[id]/hapus-buku">) {
  await dbConnect();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const asset = await OfficeAsset.findOneAndUpdate(
    { _id: id, dihapusBuku: { $ne: true } },
    {
      dihapusBuku: true,
      dihapusBukuTanggal: new Date(),
      dihapusBukuCatatan: body.catatan || undefined,
    }
  );
  if (!asset) {
    return NextResponse.json({ error: "Aset tidak ditemukan atau sudah dihapus buku" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
