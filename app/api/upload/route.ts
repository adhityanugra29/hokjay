import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import path from "node:path";
import { slugify } from "@/lib/format";

// Vercel's serverless functions have no persistent/writable local disk, so
// uploads (product photos, payment proof, etc.) go to Vercel Blob storage
// instead of public/uploads/. The store's "Connect Project" flow named its
// token env var with a store-specific prefix (Hojay_READ_WRITE_TOKEN)
// rather than the SDK's default BLOB_READ_WRITE_TOKEN, so it's passed
// explicitly here instead of relying on put()'s auto env-var lookup — see
// DEPLOYMENT.md.
export const runtime = "nodejs";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FOLDERS = ["products", "payments", "kwitansi", "komisi", "rab", "purchasing"];

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
  const pathname = `${folder}/${Date.now()}-${baseName}${ext}`;

  try {
    const blob = await put(pathname, file, { access: "public", token: process.env.Hojay_READ_WRITE_TOKEN });
    return NextResponse.json({ url: blob.url }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengunggah file" },
      { status: 500 }
    );
  }
}
