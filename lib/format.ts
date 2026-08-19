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

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
