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
  return m ? `${name} ${m}` : name;
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
