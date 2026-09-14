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
const MAX_SIZE = 5 * 1024 * 1024; // 5MB — the ORIGINAL upload; compressed output is much smaller.
const ALLOWED_FOLDERS = ["products", "payments", "kwitansi", "komisi", "rab", "purchasing", "payroll"];

// Every uploaded photo gets resized/recompressed before it ever reaches Blob
// storage — per the user's report 2026-08-26 that photos were slow to load.
// Phone cameras routinely produce 3000-4000px, multi-MB JPEGs that then get
// displayed as a Katalog card (~240px) or an invoice thumbnail; nothing here
// was shrinking that down before this change, so every view downloaded the
// full original. 1600px is generous headroom for the largest place a photo
// actually renders (Katalog PDF pages, ~794px-wide container) while still
// keeping receipt/kwitansi text legible.
//
// MAX_DIMENSION trimmed 1600 -> 1280 (2026-08-31, per the user's request to
// shrink file size further without introducing blur). Only JPEG_QUALITY
// affects visible sharpness/artifacting at a given size — that's untouched,
// since it was already deliberately tuned once before after a real blur
// complaint (see KATALOG_PDF_JPEG_QUALITY's history in KatalogClient.tsx,
// the equivalent knob for the exported PDF's own re-encoding — this is a
// separate constant for the *source* photo, same lesson applies). 1280px
// is still ~4x the real pixels the Katalog PDF's photo box needs at
// KATALOG_PDF_RENDER_SCALE (220x165 CSS px x scale 2 = 440x330 real px) and
// still generous for ZoomableImage's full-resolution zoom view (the one
// place a visitor deliberately wants maximum detail) — this is a pure
// resize-headroom trim, not a quality trim. Only applies to NEW uploads;
// existing photos already in Blob storage keep whatever size they were
// uploaded at (re-processing every existing photo would need a separate
// migration script, not done here).
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 80;
const WEBP_QUALITY = 80;

/** Resize (never upscale) + recompress. `.rotate()` with no args applies the
 * EXIF orientation tag before sharp strips metadata on output — otherwise a
 * portrait phone photo can come out sideways once EXIF is gone. */
async function compressImage(buffer: Buffer, mimeType: string): Promise<Buffer> {
  const resized = sharp(buffer)
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true });

  if (mimeType === "image/png") return resized.png({ compressionLevel: 9 }).toBuffer();
  if (mimeType === "image/webp") return resized.webp({ quality: WEBP_QUALITY }).toBuffer();
  return resized.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
}

// Product photos only (not payment proofs/receipts/etc.) get a HOJAY
// watermark on upload — per the user's original request 2026-08-25. Uses
// the existing boxed HOJAY mark (the same file the sidebar/login page
// render) rather than a new asset, per the user's confirmation the same
// day.
//
// Repositioned + enlarged 2026-09-14, per the user's report that the
// original small bottom-right badge ("18% width, fully opaque") was too
// small to actually read ("watermark itu terlalu kecil"). Centering a
// mark that size while keeping it fully opaque would have blocked the
// product itself, so this is now BOTH bigger AND translucent — the
// combination is what makes a large, centered mark tolerable at all.
// Chose "Opsi C" (55% width, 10% opacity) out of 4 candidates after
// generating real side-by-side samples (this exact function, run against
// a real Katalog photo) and getting the user's sign-off on that one.
// `ensureAlpha()` + `.linear([1,1,1,WM_OPACITY], [0,0,0,0])` is sharp's
// standard recipe for fading an otherwise-opaque overlay before
// compositing — it only scales the alpha band, RGB is untouched.
//
// IMPORTANT: this only affects photos uploaded from this point forward.
// Every photo already in Blob storage has the OLD corner watermark baked
// in permanently — the pre-watermark original was never kept, only the
// already-composited result, so there's no way to reprocess existing
// photos into the new style short of re-uploading each one by hand.
const WATERMARK_PATH = path.join(process.cwd(), "public/logo/hojay-2b-positif.png");
const WM_WIDTH_PCT = 0.55;
const WM_OPACITY = 0.1;
let watermarkBuffer: Buffer | null = null;

/** Takes an already-compressed buffer (see compressImage above) and stamps the watermark on top of it, centered. */
async function watermarkImage(compressed: Buffer, mimeType: string): Promise<Buffer> {
  if (!watermarkBuffer) watermarkBuffer = await fs.readFile(WATERMARK_PATH);

  const base = sharp(compressed);
  const meta = await base.metadata();
  const baseWidth = meta.width ?? 1200;
  const baseHeight = meta.height ?? 1200;

  const wmWidth = Math.round(baseWidth * WM_WIDTH_PCT);
  // Explicit lanczos3 kernel for the resize step (rather than whatever
  // sharp infers) keeps the badge's edges crisp — the source file
  // (public/logo/hojay-2b-positif.png) is a high-res 3900x2169 PNG, so
  // this is a pure downscale, never an upscale. Per the user's report
  // 2026-08-25 that the watermark looked blurry in the Katalog PDF.
  // ensureAlpha() first so the following linear() has an alpha band to
  // scale even though the source PNG's own background is fully opaque.
  const wm = await sharp(watermarkBuffer)
    .resize({ width: wmWidth, kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .linear([1, 1, 1, WM_OPACITY], [0, 0, 0, 0])
    .png()
    .toBuffer();
  const wmMeta = await sharp(wm).metadata();
  const wmHeight = wmMeta.height ?? wmWidth;

  let composited = base.composite([
    { input: wm, left: Math.round((baseWidth - wmWidth) / 2), top: Math.round((baseHeight - wmHeight) / 2) },
  ]);
  composited =
    mimeType === "image/png"
      ? composited.png({ compressionLevel: 9 })
      : mimeType === "image/webp"
        ? composited.webp({ quality: WEBP_QUALITY })
        : composited.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
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
    if (file.type !== "application/pdf") {
      body = await compressImage(Buffer.from(await file.arrayBuffer()), file.type);
      if (folder === "products") {
        body = await watermarkImage(body, file.type);
      }
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
