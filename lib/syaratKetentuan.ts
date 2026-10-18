/**
 * Pure helpers for the per-invoice Syarat & Ketentuan text (Invoice.
 * syaratKetentuan) — shared by the invoice form (client) and the save
 * services (server), so both sides agree on what "the same text" means.
 * Text is one numbered point per line, same shape as
 * Pengaturan.syaratKetentuan. Per the user's request 2026-10-12.
 */

/** Keeps the printed S&K block from overflowing the invoice PDF layout. */
export const SK_MAX_POIN = 15;
export const SK_MAX_CHARS_PER_POIN = 1000;
/**
 * Per-poin and poin-count limits alone no longer bound the block's height
 * (15 × 1000 would be taller than an A4 page, and InvoicePrintDoc clips
 * anything past one page). ~3500 total characters stays within a single
 * dedicated S&K page (≈108 mono chars/line, ≈45 lines) — so the PDF layout
 * is unchanged: S&K still either joins the footer or gets one page of its own.
 */
export const SK_MAX_CHARS_TOTAL = 3500;

/** Trims each line and drops blank ones — same rule the Admin → Invoice template form applies on save. */
export function parseSyaratPoin(text: string | null | undefined): string[] {
  return (text ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Canonical stored form: trimmed non-blank lines joined by "\n". */
export function normalizeSyarat(text: string | null | undefined): string {
  return parseSyaratPoin(text).join("\n");
}

/** Error message if `text` breaks the size limits, otherwise null. */
export function validateSyarat(text: string): string | null {
  const poin = parseSyaratPoin(text);
  if (poin.length > SK_MAX_POIN) return `Syarat & Ketentuan maksimal ${SK_MAX_POIN} poin.`;
  if (poin.some((p) => p.length > SK_MAX_CHARS_PER_POIN)) {
    return `Setiap poin Syarat & Ketentuan maksimal ${SK_MAX_CHARS_PER_POIN} karakter.`;
  }
  if (poin.reduce((n, p) => n + p.length, 0) > SK_MAX_CHARS_TOTAL) {
    return `Total Syarat & Ketentuan maksimal ${SK_MAX_CHARS_TOTAL} karakter agar muat di PDF.`;
  }
  return null;
}
