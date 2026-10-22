"use client";

// Shared html2pdf.js render settings — every PDF export in this app (this
// file, KatalogClient's Katalog PDF, DownloadReportButton's Akuntansi
// reports) should use the same two knobs so file size stays predictable
// everywhere. Lowered from quality 0.98 / scale 2 per the user's report
// 2026-08-26 that downloaded PDFs were slow to load — 0.98 is near-lossless
// JPEG (barely smaller than the source render) and scale 2 rasterizes at
// 2x pixel density; together they produced multi-page catalogs several MB
// in size. 0.85 quality is still visually clean for product photos and
// document text, and scale 1.5 is still sharper than a 100% render while
// cutting the pixel count (and therefore file size) by more than half
// versus scale 2 ((1.5/2)^2 ≈ 56%).
export const PDF_JPEG_QUALITY = 0.85;
export const PDF_RENDER_SCALE = 1.5;

// Katalog/Invoice page PDFs are photo- and text-dense, so they use a higher
// render scale and JPEG quality than the report export above. RENDER_SCALE
// 1.35 and JPEG quality 0.78/0.82 all read as blurry on small SKU/spec text
// (JPEG is rough on fine text edges below near-lossless), so these stay at
// 2 / 0.94; file size is kept down by the adaptive page packing instead.
const PAGE_PDF_SCALE = 2;
const PAGE_PDF_JPEG_QUALITY = 0.94;

/**
 * Captures every `[data-print-page]` child of `element` into one multi-page
 * A4 jsPDF (per-page html2canvas, so nothing can bleed across a page
 * boundary). Returns null when there are no pages. The caller decides
 * whether to .save() it or turn it into a File.
 */
export async function capturePagesToPdf(element: HTMLElement) {
  // html2canvas captures whatever is painted at that instant, so an
  // in-flight image would come out blank (and throw pagination off).
  await Promise.all(
    Array.from(element.querySelectorAll("img")).map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          })
    )
  );

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const pageEls = Array.from(element.querySelectorAll<HTMLElement>("[data-print-page]"));
  if (pageEls.length === 0) return null;

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidthMM = pdf.internal.pageSize.getWidth();
  const pageHeightMM = pdf.internal.pageSize.getHeight();

  // Sequential on purpose: Promise.all was tried (2026-08-31) and was
  // slower — by now every image is loaded, so html2canvas is pure
  // synchronous DOM-clone + rasterize work that can't overlap, and parallel
  // only held every page's canvas in memory at once.
  for (let i = 0; i < pageEls.length; i++) {
    // scrollY: otherwise html2canvas captures from the current window scroll
    // position (reported 2026-08-25). logging:false / imageTimeout:0 skip
    // per-element logging overhead and image waits (all images are loaded).
    const canvas = await html2canvas(pageEls[i], {
      scale: PAGE_PDF_SCALE,
      useCORS: true,
      scrollY: -window.scrollY,
      scrollX: 0,
      logging: false,
      imageTimeout: 0,
    });
    if (i > 0) pdf.addPage();
    // "FAST" is jsPDF's own stream compression of the already-JPEG bytes.
    pdf.addImage(canvas.toDataURL("image/jpeg", PAGE_PDF_JPEG_QUALITY), "JPEG", 0, 0, pageWidthMM, pageHeightMM, undefined, "FAST");
  }
  return pdf;
}
