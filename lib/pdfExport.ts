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

/**
 * Builds an off-screen container, fills it with the given HTML, captures it
 * with html2pdf.js, and triggers a direct download — then cleans up. Used
 * for reports that don't have (and don't need) their own page, like Jurnal
 * Umum and Buku Besar.
 */
export async function downloadReportPdf(opts: {
  filename: string;
  title: string;
  subtitle?: string;
  bodyHtml: string;
}) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "-9999px";
  container.style.width = "800px";
  container.style.background = "#ffffff";
  container.style.padding = "20px";
  container.style.color = "#16232a";
  container.style.fontFamily = "'Space Grotesk', ui-sans-serif, system-ui, sans-serif";
  container.innerHTML = `
    <h1 style="font-family: Georgia, serif; font-size: 1.6rem; font-weight: 600; margin: 0 0 4px;">${opts.title}</h1>
    ${
      opts.subtitle
        ? `<div style="font-family: 'IBM Plex Mono', monospace; font-size: 0.75rem; color: #7c7666; margin-bottom: 20px;">${opts.subtitle}</div>`
        : ""
    }
    ${opts.bodyHtml}
  `;
  document.body.appendChild(container);

  try {
    const { default: html2pdf } = await import("html2pdf.js");
    await html2pdf()
      .set({
        margin: 10,
        filename: opts.filename,
        image: { type: "jpeg", quality: PDF_JPEG_QUALITY },
        html2canvas: { scale: PDF_RENDER_SCALE, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(container)
      .save();
  } finally {
    document.body.removeChild(container);
  }
}

export const reportTableStyle = {
  table: "width:100%; border-collapse:collapse; font-size:11px;",
  th: "text-align:left; border-bottom:1.5px solid #16232a; padding:6px 8px; font-family:'IBM Plex Mono',monospace; font-size:9px; text-transform:uppercase; color:#7c7666;",
  td: "border-bottom:1px solid #ddd6c4; padding:6px 8px;",
  tdRight: "border-bottom:1px solid #ddd6c4; padding:6px 8px; text-align:right; font-family:'IBM Plex Mono',monospace;",
};
