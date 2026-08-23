import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Absensi } from "@/models/Absensi";
import { getSession } from "@/lib/auth/session";

/** Un-mark a hadir record (e.g. checked by mistake). */
export async function DELETE(_req: Request, ctx: RouteContext<"/api/absensi/[id]">) {
  await dbConnect();
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Hanya Admin yang bisa mengubah absensi" }, { status: 403 });
  }
  const { id } = await ctx.params;
  await Absensi.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
