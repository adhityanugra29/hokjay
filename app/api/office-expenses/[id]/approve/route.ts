import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { OfficeExpenseRequest } from "@/models/OfficeExpenseRequest";
import { getSession } from "@/lib/auth/session";

/**
 * Admin-only action, checked here (not via a path-prefix rule in
 * lib/auth/access.ts) since the rest of /api/office-expenses stays open to
 * any logged-in role — only the approve/reject step itself is privileged.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/office-expenses/[id]/approve">) {
  await dbConnect();
  const { id } = await ctx.params;
  const body = await req.json();
  const session = await getSession();

  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Hanya Admin yang bisa menyetujui atau menolak request" }, { status: 403 });
  }

  const approved = body.approved === true;
  if (!approved && !body.alasanTolak?.trim()) {
    return NextResponse.json({ error: "Alasan penolakan wajib diisi" }, { status: 400 });
  }

  const request = await OfficeExpenseRequest.findOneAndUpdate(
    { _id: id, status: "diajukan" },
    approved
      ? { status: "disetujui", disetujuiOleh: session.nama, disetujuiTanggal: new Date() }
      : { status: "ditolak", disetujuiOleh: session.nama, disetujuiTanggal: new Date(), alasanTolak: body.alasanTolak.trim() }
  );
  if (!request) {
    return NextResponse.json({ error: "Request tidak ditemukan atau sudah diproses" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
