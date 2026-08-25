import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import path from "node:path";
import fs from "node:fs/promises";
import sharp from "sharp";
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
const ALLOWED_FOLDERS = ["products", "payments", "kwitansi", "komisi", "rab", "purchasing", "payroll"];

// Product photos only (not payment proofs/receipts/etc.) get a small
// bottom-right watermark on upload — per the user's request 2026-08-25.
// Uses the existing boxed HOJAY mark (the same file the sidebar/login page
// render) rather than a new asset, per the user's confirmation the same
// day. That file's background is fully opaque (not transparent — checked
// via sharp metadata), so this reads as a small branded badge stamped in
// the corner, not a translucent overlay.
const WATERMARK_PATH = path.join(process.cwd(), "public/logo/hojay-2b-positif.png");
let watermarkBuffer: Buffer | null = null;

async function watermarkImage(buffer: Buffer, mimeType: string): Promise<Buffer> {
  if (!watermarkBuffer) watermarkBuffer = await fs.readFile(WATERMARK_PATH);

  const base = sharp(buffer);
  const meta = await base.metadata();
  const baseWidth = meta.width ?? 1200;
  const baseHeight = meta.height ?? 1200;

  const wmWidth = Math.round(baseWidth * 0.18);
  const margin = Math.round(baseWidth * 0.025);
  // Explicit lanczos3 kernel + PNG output for the resize step (rather than
  // whatever format sharp infers) keeps the badge's edges crisp — the
  // source file (public/logo/hojay-2b-positif.png) is a high-res 3900x2169
  // PNG, so this is a pure downscale, never an upscale. Per the user's
  // report 2026-08-25 that the watermark looked blurry in the Katalog PDF.
  const wm = await sharp(watermarkBuffer).resize({ width: wmWidth, kernel: sharp.kernel.lanczos3 }).png().toBuffer();
  const wmMeta = await sharp(wm).metadata();
  const wmHeight = wmMeta.height ?? wmWidth;

  let composited = base.composite([
    { input: wm, left: Math.max(0, baseWidth - wmWidth - margin), top: Math.max(0, baseHeight - wmHeight - margin) },
  ]);
  // Quality bumped 90 -> 96: the composite gets re-encoded as JPEG here
  // (one recompression pass on top of whatever the original upload already
  // was), and the watermark's fine text/edges showed that pass the most.
  composited =
    mimeType === "image/png" ? composited.png() : mimeType === "image/webp" ? composited.webp() : composited.jpeg({ quality: 96 });
  return composited.toBuffer();
}

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
    let body: File | Buffer = file;
    if (folder === "products" && file.type !== "application/pdf") {
      body = await watermarkImage(Buffer.from(await file.arrayBuffer()), file.type);
    }
    const blob = await put(pathname, body, {
      access: "public",
      token: process.env.Hojay_READ_WRITE_TOKEN,
      contentType: file.type,
    });
    return NextResponse.json({ url: blob.url }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengunggah file" },
      { status: 500 }
    );
  }
}
