import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { getSession } from "@/lib/auth/session";

/**
 * Per-sales customer privacy (see lib/pelanggan.ts's customerVisibilityFilter)
 * applies here too, not just to the list/GET-many endpoint — a plain "sales"
 * account can't view, edit, or delete another rep's customer directly by ID
 * either. Manager/Admin/Owner/Super Admin are unrestricted. A customer with
 * no owner (assignedSales unset) is now blocked for every sales rep too —
 * tightened 2026-08-30, matching customerVisibilityFilter's own change.
 */
function isBlockedForSession(session: Awaited<ReturnType<typeof getSession>>, assignedSales?: string | null) {
  return session?.role === "sales" && assignedSales !== session.nama;
}

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/customers/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  const session = await getSession();
  const customer = await Customer.findById(id);
  if (!customer) return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
  if (isBlockedForSession(session, customer.assignedSales)) {
    return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json(customer);
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/customers/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  const session = await getSession();
  const body = await req.json();

  try {
    const customer = await Customer.findById(id);
    if (!customer) return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
    if (isBlockedForSession(session, customer.assignedSales)) {
      return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
    }

    for (const key of [
      "nama",
      "namaToko",
      "jenisUsaha",
      "whatsapp",
      "email",
      "alamat",
      "kota",
      "provinsi",
      "termHari",
      "catatan",
    ]) {
      if (body[key] !== undefined) customer.set(key, body[key]);
    }
    await customer.save();
    return NextResponse.json(customer);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memperbarui pelanggan" },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/customers/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  const session = await getSession();
  const customer = await Customer.findById(id);
  if (!customer) return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
  if (isBlockedForSession(session, customer.assignedSales)) {
    return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
  }
  // No guard against existing invoices — same convention as product
  // deletion (app/api/products/[id]/route.ts). Those invoices keep their
  // own snapshotted customer.nama/whatsapp regardless, so they still
  // display fine; only the customer.ref link goes dangling.
  await Customer.deleteOne({ _id: id });
  return NextResponse.json({ ok: true });
}
