"use client";

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
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
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
