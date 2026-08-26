import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { getSession } from "@/lib/auth/session";

/**
 * Self-service password change — every logged-in role, not just accounts
 * Admin can already reset via /api/admin/users/[id]. Requires the current
 * password (bcrypt-verified) so a stray unlocked session can't silently
 * lock someone else out of their own account.
 */
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const passwordLama = typeof body.passwordLama === "string" ? body.passwordLama : "";
  const passwordBaru = typeof body.passwordBaru === "string" ? body.passwordBaru : "";

  if (!passwordLama) {
    return NextResponse.json({ error: "Masukkan password sekarang" }, { status: 400 });
  }
  if (passwordBaru.length < 6) {
    return NextResponse.json({ error: "Password baru minimal 6 karakter" }, { status: 400 });
  }

  await dbConnect();
  const user = await User.findById(session.userId);
  if (!user) return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });

  const cocok = await bcrypt.compare(passwordLama, user.passwordHash);
  if (!cocok) {
    return NextResponse.json({ error: "Password sekarang salah" }, { status: 400 });
  }

  user.passwordHash = await bcrypt.hash(passwordBaru, 10);
  await user.save();

  return NextResponse.json({ ok: true });
}
