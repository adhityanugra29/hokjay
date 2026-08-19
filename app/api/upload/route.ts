import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { slugify } from "@/lib/format";

export const runtime = "nodejs";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FOLDERS = ["products", "payments"];

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");
  const folder = String(formData.get("folder") || "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
  }
  if (!ALLOWED_FOLDERS.includes(folder)) {
    return NextResponse.json({ error: "Folder tujuan tidak valid" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tipe file tidak didukung (JPG/PNG/WEBP/PDF saja)" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Ukuran file maksimal 5MB" }, { status: 400 });
  }

  const ext = path.extname(file.name) || (file.type === "application/pdf" ? ".pdf" : ".jpg");
  const baseName = slugify(path.basename(file.name, ext)) || "file";
  const fileName = `${Date.now()}-${baseName}${ext}`;

  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, fileName), bytes);

  return NextResponse.json({ url: `/uploads/${folder}/${fileName}` }, { status: 201 });
}
