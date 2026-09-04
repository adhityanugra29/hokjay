import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import { User, USER_ROLES } from "@/models/User";
import { getSession } from "@/lib/auth/session";
import { isAkunLoginAllowed } from "@/lib/auth/access";

// Owner/Super Admin only — see the matching comment in ../route.ts. Extra
// important here specifically: without this, a raw PATCH could let a
// Manager grant themselves (or anyone) a higher role, or reset another
// account's password.
async function requireAkunLoginAccess() {
  const session = await getSession();
  if (!session || !isAkunLoginAllowed(session.role)) {
    return NextResponse.json({ error: "Hanya Owner/Super Admin yang bisa mengelola Akun Login" }, { status: 403 });
  }
  return null;
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/users/[id]">) {
  const denied = await requireAkunLoginAccess();
  if (denied) return denied;
  await dbConnect();
  const { id } = await ctx.params;
  const body = await req.json();

  const update: Record<string, unknown> = {};
  if (typeof body.nama === "string" && body.nama.trim()) update.nama = body.nama.trim();
  if (typeof body.email === "string" && body.email.trim()) update.email = body.email.trim().toLowerCase();
  if (typeof body.aktif === "boolean") update.aktif = body.aktif;
  if (body.role !== undefined) {
    if (!USER_ROLES.includes(body.role)) {
      return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
    }
    update.role = body.role;
  }
  if (typeof body.password === "string" && body.password) {
    if (body.password.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    }
    update.passwordHash = await bcrypt.hash(body.password, 10);
  }

  try {
    const user = await User.findByIdAndUpdate(id, update, { new: true }).select("-passwordHash");
    if (!user) return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
    return NextResponse.json(user);
  } catch (err) {
    const isDup = err instanceof Error && "code" in err && (err as { code?: number }).code === 11000;
    return NextResponse.json(
      { error: isDup ? "Email sudah dipakai akun lain" : err instanceof Error ? err.message : "Gagal memperbarui akun" },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/admin/users/[id]">) {
  const denied = await requireAkunLoginAccess();
  if (denied) return denied;
  await dbConnect();
  const { id } = await ctx.params;
  await User.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
