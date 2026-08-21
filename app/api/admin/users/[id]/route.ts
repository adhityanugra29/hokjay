import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import { User, USER_ROLES } from "@/models/User";

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/users/[id]">) {
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
  await dbConnect();
  const { id } = await ctx.params;
  await User.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
