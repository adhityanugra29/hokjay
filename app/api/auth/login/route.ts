import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { createSession } from "@/lib/auth/session";

export async function POST(req: Request) {
  await dbConnect();
  const body = await req.json();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 });
  }

  const user = await User.findOne({ email });
  if (!user || !user.aktif) {
    return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
  }

  await createSession({ id: String(user._id), nama: user.nama, role: user.role as "sales" | "finance" | "admin" });

  return NextResponse.json({ nama: user.nama, role: user.role });
}
