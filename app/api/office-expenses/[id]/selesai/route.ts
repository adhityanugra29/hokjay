import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { OfficeExpenseRequest } from "@/models/OfficeExpenseRequest";
import { getSession } from "@/lib/auth/session";

/** Final step — proof the purchase itself actually went through (token listrik masuk, wifi aktif, pulsa terisi), not just that money was sent. */
export async function POST(req: Request, ctx: RouteContext<"/api/office-expenses/[id]/selesai">) {
  await dbConnect();
  const { id } = await ctx.params;
  const body = await req.json();
  const session = await getSession();

  if (!body.buktiUrl) return NextResponse.json({ error: "Bukti pembelian berhasil wajib diupload" }, { status: 400 });

  const request = await OfficeExpenseRequest.findOneAndUpdate(
    { _id: id, status: "dibayar" },
    {
      status: "selesai",
      buktiBerhasilUrl: body.buktiUrl,
      buktiBerhasilCatatan: body.catatan || undefined,
      buktiBerhasilTanggal: new Date(),
      buktiBerhasilOleh: session?.nama,
    }
  );
  if (!request) {
    return NextResponse.json({ error: "Request tidak ditemukan atau belum ditransfer" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
