import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Jasa } from "@/models/Jasa";

export async function GET(_req: Request, ctx: RouteContext<"/api/jasa/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  const jasa = await Jasa.findById(id);
  if (!jasa) return NextResponse.json({ error: "Jasa tidak ditemukan" }, { status: 404 });
  return NextResponse.json(jasa);
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/jasa/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  const body = await req.json();

  const update: Record<string, unknown> = {};
  for (const key of ["nama", "kode", "aktif"]) {
    if (key in body) update[key] = body[key];
  }

  try {
    const jasa = await Jasa.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!jasa) return NextResponse.json({ error: "Jasa tidak ditemukan" }, { status: 404 });
    return NextResponse.json(jasa);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menyimpan jasa" },
      { status: 400 }
    );
  }
}
