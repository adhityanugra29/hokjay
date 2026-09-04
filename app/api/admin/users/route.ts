import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import { User, USER_ROLES } from "@/models/User";
import { getSession } from "@/lib/auth/session";
import { isAkunLoginAllowed } from "@/lib/auth/access";

// Owner/Super Admin only — per the user's request 2026-09-04. The general
// /api/admin prefix's own middleware check (proxy.ts) only requires
// isAdminLevel, which Manager also satisfies; this route needs its own
// stricter check on top; same isolation pattern as
// app/api/products/[id]/komisi-bekas/route.ts.
async function requireAkunLoginAccess() {
  const session = await getSession();
  if (!session || !isAkunLoginAllowed(session.role)) {
    return NextResponse.json({ error: "Hanya Owner/Super Admin yang bisa mengelola Akun Login" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const denied = await requireAkunLoginAccess();
  if (denied) return denied;
  await dbConnect();
  const users = await User.find().select("-passwordHash").sort({ nama: 1 });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const denied = await requireAkunLoginAccess();
  if (denied) return denied;
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
