import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import { User, USER_ROLES } from "@/models/User";

export async function GET() {
  await dbConnect();
  const users = await User.find().select("-passwordHash").sort({ nama: 1 });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  await dbConnect();
  const body = await req.json();
  const nama = String(body.nama || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const role = body.role;

  if (!nama || !email || !password) {
    return NextResponse.json({ error: "Nama, email, dan password wajib diisi" }, { status: 400 });
  }
  if (!USER_ROLES.includes(role)) {
    return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ nama, email, passwordHash, role });
    const { passwordHash: _omit, ...safe } = user.toObject();
    return NextResponse.json(safe, { status: 201 });
  } catch (err) {
    const isDup = err instanceof Error && "code" in err && (err as { code?: number }).code === 11000;
    return NextResponse.json(
      { error: isDup ? "Email sudah terdaftar" : err instanceof Error ? err.message : "Gagal membuat akun" },
      { status: 400 }
    );
  }
}
