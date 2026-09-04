export function rupiah(amount: number): string {
  return "Rp " + Math.round(amount).toLocaleString("id-ID");
}

/** Compact form used on stat cards, e.g. "Rp 1,04jt" / "Rp 573rb". */
export function rupiahCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000_000) {
    return `${sign}Rp ${(abs / 1_000_000_000).toFixed(2).replace(".", ",")}M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}Rp ${(abs / 1_000_000).toFixed(2).replace(/,?0+$/, "").replace(".", ",")}jt`;
  }
  if (abs >= 1_000) {
    return `${sign}Rp ${Math.round(abs / 1000)}rb`;
  }
  return rupiah(amount);
}

const DAY_NAMES = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
const MONTH_LONG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function formatDateShort(date: Date | string): string {
  const d = new Date(date);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

export function formatDateLong(date: Date | string): string {
  const d = new Date(date);
  return `${d.getDate()} ${MONTH_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateFull(date: Date | string): string {
  const d = new Date(date);
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * "Kulkas Hosizaki" from name "Kulkas" + merk "Hosizaki" — just the name
 * if no merk is set. So the sales/customer-facing surfaces (Katalog card
 * + PDF, Invoice's product picker + snapshot) show the brand automatically
 * from the existing Merk field instead of requiring it typed into Nama
 * Produk. Per the user's request 2026-09-02 ("kulkas hosizaki... user
 * tidak perlu input merk di judul"). The stored `name` itself is left
 * untouched — this only affects what's displayed/snapshotted.
 */
export function productDisplayName(name: string, merk?: string | null): string {
  const m = merk?.trim();
  // "-" (and bare "—") is a real stored value on ~135 of 225 existing
  // products — a pre-existing data-entry convention for "no merk", not an
  // actual brand. Found 2026-09-03 after the user reported names like
  // "Working Table -" — treated the same as genuinely empty.
  return m && m !== "-" && m !== "—" ? `${name} ${m}` : name;
}

/**
 * Local Indonesian phone/WhatsApp number ("0812...", however it was
 * typed/pasted, dashes/spaces and all) -> a wa.me-ready international
 * number ("62812..."), or "" if there's nothing usable. wa.me silently
 * fails to open a chat for a number still carrying the local leading "0"
 * (no error, the WhatsApp Web/app landing page just doesn't load a
 * conversation) — found as a real bug 2026-09-04: InvoiceActions.tsx's
 * own "Kirim WA" (invoice detail page) already did this conversion,
 * InvoiceListClient.tsx's "Kirim WA" (invoice list row, added by TASK-009
 * the same day) didn't, since it built the wa.me link inline instead of
 * sharing this logic. Centralized here so the two can't drift apart
 * again.
 */
export function toWaPhone(phone?: string | null): string {
  const digits = (phone ?? "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * "120x80x60 cm" from a product's P/L/T — undefined if none of the three
 * are set. Used for the invoice item's dimensiSnapshot (see
 * models/Invoice.ts) and anywhere else a compact size string is needed.
 */
export function formatDimensi(
  dimensi?: {
    panjangCm?: number | null;
    lebarCm?: number | null;
    tinggiCm?: number | null;
  } | null
): string | undefined {
  if (!dimensi) return undefined;
  const { panjangCm, lebarCm, tinggiCm } = dimensi;
  if (!panjangCm && !lebarCm && !tinggiCm) return undefined;
  return `${panjangCm ?? "—"}x${lebarCm ?? "—"}x${tinggiCm ?? "—"} cm`;
}
