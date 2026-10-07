import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Jasa } from "@/models/Jasa";
import { Invoice } from "@/models/Invoice";
import { getSession } from "@/lib/auth/session";
import { isProductDeleteAllowed } from "@/lib/auth/access";

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

// Owner-only, same rule as deleting a product (lib/auth/access.ts's
// isProductDeleteAllowed). A jasa already used on an invoice can't be deleted —
// the invoice's edit page and updateInvoice look the jasa up by id, so
// removing it would break editing that invoice; deactivate it instead (Ubah →
// Status Nonaktif). Per the user's request 2026-10-07.
export async function DELETE(_req: Request, ctx: RouteContext<"/api/jasa/[id]">) {
  const session = await getSession();
  if (!isProductDeleteAllowed(session?.role)) {
    return NextResponse.json({ error: "Hanya Owner yang bisa menghapus jasa" }, { status: 403 });
  }
  await dbConnect();
  const { id } = await ctx.params;
  if (await Invoice.exists({ "items.jasa": id })) {
    return NextResponse.json(
      { error: "Jasa ini sudah dipakai di invoice dan tidak bisa dihapus. Nonaktifkan saja lewat Ubah." },
      { status: 409 }
    );
  }
  const jasa = await Jasa.findByIdAndDelete(id);
  if (!jasa) return NextResponse.json({ error: "Jasa tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
