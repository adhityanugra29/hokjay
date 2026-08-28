import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { slugify } from "@/lib/format";

export const runtime = "nodejs";

/**
 * Streams a product's main photo back as a download, baking the P×L×T
 * dimension footnote onto it server-side via sharp when the product has
 * all three measurements — moved here from a client-side <canvas>
 * composite (components/katalog/ProductCard.tsx, 2026-08-27) per the
 * user's report 2026-08-28 that the footnote sometimes came out missing
 * across different accounts with no clear pattern. A browser-side canvas
 * draw of a cross-origin image depends on that browser's own CORS/image
 * caching behavior to avoid "tainting" the canvas — invisible and
 * inconsistent across devices. Doing it server-side with sharp removes
 * that dependency entirely; sharp already does exactly this kind of
 * image compositing for the upload-time watermark (see
 * app/api/upload/route.ts's watermarkImage), just with an SVG text badge
 * instead of a logo PNG.
 *
 * Round 2 (2026-08-28, same day): the first version used
 * font-family="sans-serif" and rendered as unreadable tofu boxes in
 * production ("liat ini, malah tidak muncul angkanya") — Vercel's
 * serverless container has no system fonts installed at all, so
 * librsvg (sharp's SVG rasterizer) had nothing to fall back to for a
 * generic family name. Fixed by embedding the actual font file as a
 * base64 @font-face data URI directly inside the SVG document (see
 * public/fonts/Archivo-SemiBold.ttf, the same family already used for
 * the app's own UI) — the font bytes travel with the SVG, so it no
 * longer depends on anything being installed on the machine that
 * rasterizes it. Lives under public/ specifically (not some other repo
 * folder) so Vercel's serverless bundler is guaranteed to include it —
 * the same reason app/api/upload/route.ts's watermark PNG lives under
 * public/logo/ instead of somewhere else.
 */

let fontBase64Cache: string | null = null;
async function getFontBase64(): Promise<string> {
  if (!fontBase64Cache) {
    const buf = await fs.readFile(path.join(process.cwd(), "public/fonts/Archivo-SemiBold.ttf"));
    fontBase64Cache = buf.toString("base64");
  }
  return fontBase64Cache;
}

function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
}

/** Same visual sizing/positioning as the old canvas version, ported to SVG. */
async function buildLabelSvg(label: string, imgWidth: number): Promise<{ svg: Buffer; boxWidth: number; boxHeight: number; margin: number }> {
  const fontBase64 = await getFontBase64();
  const fontSize = Math.max(16, Math.round(imgWidth * 0.022));
  const padX = fontSize * 0.6;
  const padY = fontSize * 0.45;
  // sharp's composite() requires integer left/top offsets — margin feeds
  // into both the SVG box math and the caller's left/top, so it has to be
  // a whole number too (fontSize * 0.5 is a .5 fraction on any odd
  // fontSize). Confirmed via a real test run against a real product photo
  // before this fix: sharp threw "Expected integer for left but received
  // 10.5" on the very first try.
  const margin = Math.round(fontSize * 0.5);
  // No real text-measuring API on the server side — approximate glyph
  // width for a generic sans-serif, then pad generously so the box is
  // never too tight (a little extra breathing room reads fine; a
  // clipped label doesn't).
  const textWidth = label.length * fontSize * 0.58;
  const boxWidth = Math.round(textWidth + padX * 2);
  const boxHeight = Math.round(fontSize + padY * 2);
  const svg = `<svg width="${boxWidth}" height="${boxHeight}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>
        @font-face {
          font-family: 'LabelFont';
          src: url(data:font/ttf;base64,${fontBase64}) format('truetype');
        }
      </style>
    </defs>
    <rect width="${boxWidth}" height="${boxHeight}" fill="rgba(32,30,29,0.7)" />
    <text x="${padX}" y="50%" dominant-baseline="middle" font-family="LabelFont" font-size="${fontSize}" fill="#ffffff">${escapeXml(label)}</text>
  </svg>`;
  return { svg: Buffer.from(svg), boxWidth, boxHeight, margin };
}

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/products/[id]/download-photo">) {
  await dbConnect();
  const { id } = await ctx.params;
  const product = await Product.findById(id).select("name fotoUrl dimensi").lean();
  if (!product?.fotoUrl) {
    return NextResponse.json({ error: "Foto tidak ditemukan" }, { status: 404 });
  }

  const photoRes = await fetch(product.fotoUrl);
  if (!photoRes.ok) {
    return NextResponse.json({ error: "Gagal mengambil foto" }, { status: 502 });
  }
  const original = Buffer.from(await photoRes.arrayBuffer());

  const d = product.dimensi;
  const label = d?.panjangCm && d?.lebarCm && d?.tinggiCm ? `${d.panjangCm}cm x ${d.lebarCm}cm x ${d.tinggiCm}cm` : null;
  const baseName = slugify(product.name) || "produk";

  if (!label) {
    const contentType = photoRes.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    return new NextResponse(original, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${baseName}.${ext}"`,
      },
    });
  }

  const meta = await sharp(original).metadata();
  const imgWidth = meta.width ?? 1200;
  const imgHeight = meta.height ?? 1200;
  const { svg, boxWidth, boxHeight, margin } = await buildLabelSvg(label, imgWidth);
  const top = Math.max(0, imgHeight - boxHeight - margin);

  const composited = await sharp(original)
    .composite([{ input: svg, left: Math.max(0, Math.min(margin, imgWidth - boxWidth)), top }])
    .jpeg({ quality: 92 })
    .toBuffer();

  return new NextResponse(composited, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": `attachment; filename="${baseName}.jpg"`,
    },
  });
}
