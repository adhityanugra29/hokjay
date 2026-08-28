import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import opentype from "opentype.js";
import fs from "node:fs/promises";
import path from "node:path";
import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { slugify } from "@/lib/format";

export const runtime = "nodejs";

/**
 * Streams a product's main photo back as a download, baking the P×L×T
 * dimension footnote onto it server-side when the product has all three
 * measurements.
 *
 * History (all same day, 2026-08-28):
 * 1. Originally a client-side <canvas> composite in ProductCard.tsx —
 *    the user reported the footnote sometimes came out missing across
 *    different accounts. A browser-side canvas draw of a cross-origin
 *    photo depends on that browser's own CORS/image-cache behavior to
 *    avoid "tainting" the canvas, which isn't reliably consistent
 *    across devices. Moved here to remove that dependency.
 * 2. First server version used an SVG <text> element with
 *    font-family="sans-serif" — rendered as unreadable tofu boxes in
 *    production, because Vercel's serverless container has no system
 *    fonts installed for sharp's SVG rasterizer to fall back to.
 * 3. Tried embedding the font file as a base64 @font-face data URI in
 *    the SVG — still tofu boxes. <text> rendering goes through a
 *    font-shaping engine (Pango, via librsvg) that apparently isn't
 *    functional in this container at all, regardless of which font is
 *    referenced or how it's supplied.
 * 4. This version: no <text> element at all. opentype.js reads the
 *    font file directly and computes each character's glyph OUTLINE as
 *    raw SVG path data — pure vector geometry, composed manually one
 *    character at a time. sharp/librsvg can always rasterize a <path>;
 *    it's just shapes, nothing font-engine-dependent about it, so this
 *    can't hit the same class of failure again regardless of server
 *    environment.
 *
 * Per-character glyph lookup (font.charToGlyph), not
 * font.getPath(fullString, ...) — the latter runs the font's full GSUB
 * contextual-substitution pipeline (ligatures etc.), which threw
 * ("substFormat: 2 is not yet supported") on this exact font file. A
 * single character can't ligature with nothing, so charToGlyph
 * sidesteps that pipeline entirely.
 */

let fontCache: opentype.Font | null = null;
async function getFont(): Promise<opentype.Font> {
  if (!fontCache) {
    // Lives under public/ specifically (not some other repo folder) so
    // Vercel's serverless bundler is guaranteed to include it — the same
    // reason app/api/upload/route.ts's watermark PNG lives under
    // public/logo/ instead of somewhere else.
    const buf = await fs.readFile(path.join(process.cwd(), "public/fonts/Archivo-SemiBold.ttf"));
    const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    fontCache = opentype.parse(arrayBuffer);
  }
  return fontCache;
}

/** Lays out `label` as raw glyph-outline paths — see the route doc comment for why. */
async function buildLabelSvg(label: string, imgWidth: number): Promise<{ svg: Buffer; boxWidth: number; boxHeight: number; margin: number }> {
  const font = await getFont();
  const fontSize = Math.max(16, Math.round(imgWidth * 0.022));
  const padX = fontSize * 0.6;
  const padY = fontSize * 0.45;
  // sharp's composite() requires integer left/top offsets.
  const margin = Math.round(fontSize * 0.5);
  const scale = fontSize / font.unitsPerEm;

  let x = 0;
  let minY = Infinity;
  let maxY = -Infinity;
  const glyphPaths: string[] = [];
  for (const ch of label) {
    const glyph = font.charToGlyph(ch);
    const glyphPath = glyph.getPath(x, 0, fontSize);
    const bbox = glyphPath.getBoundingBox();
    if (bbox.y1 < minY) minY = bbox.y1;
    if (bbox.y2 > maxY) maxY = bbox.y2;
    glyphPaths.push(glyphPath.toPathData(1));
    x += (glyph.advanceWidth ?? font.unitsPerEm * 0.5) * scale;
  }

  const boxWidth = Math.round(x + padX * 2);
  const boxHeight = Math.round(fontSize + padY * 2);
  // A space-only label (shouldn't happen — dimensions are always
  // numeric) would leave minY/maxY at their Infinity sentinels; fall
  // back to vertical-centering on 0 rather than propagate NaN.
  const textCenterY = Number.isFinite(minY) && Number.isFinite(maxY) ? (minY + maxY) / 2 : 0;
  const yOffset = boxHeight / 2 - textCenterY;

  const svg = `<svg width="${boxWidth}" height="${boxHeight}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${boxWidth}" height="${boxHeight}" fill="rgba(32,30,29,0.7)" />
    <g transform="translate(${padX} ${yOffset})">
      ${glyphPaths.map((d) => `<path d="${d}" fill="#ffffff" />`).join("")}
    </g>
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
