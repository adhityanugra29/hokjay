/**
 * Chart of Accounts — adapted from the user's rancangan-coa-jurnal-otomatis.md
 * for this app's actual Mongoose data model (the original doc assumed
 * Postgres/Supabase + a formal Purchase Order flow; this app tracks stock
 * purchases as a simple manual cash expense instead, and has no PO, tax, or
 * invoice-cancellation feature yet — see lib/services/journal.ts for what's
 * actually wired up).
 */
export type AccountKelompok = "Aset" | "Kewajiban" | "Ekuitas" | "Pendapatan" | "HPP" | "Beban";

export interface Account {
  code: string;
  name: string;
  kelompok: AccountKelompok;
  /** Normal balance side — Aset & Beban & HPP are debit-normal, the rest credit-normal. */
  normal: "debit" | "credit";
}

export const ACCOUNTS: Account[] = [
  // Aset
  { code: "1101", name: "Kas", kelompok: "Aset", normal: "debit" },
  { code: "1102", name: "Bank", kelompok: "Aset", normal: "debit" },
  { code: "1200", name: "Piutang Usaha (AR)", kelompok: "Aset", normal: "debit" },
  { code: "1300", name: "Persediaan Barang Dagang", kelompok: "Aset", normal: "debit" },
  // Kewajiban
  { code: "2200", name: "Utang Komisi Sales", kelompok: "Kewajiban", normal: "credit" },
  // Ekuitas
  { code: "3100", name: "Modal Pemilik", kelompok: "Ekuitas", normal: "credit" },
  { code: "3200", name: "Prive / Penarikan Pemilik", kelompok: "Ekuitas", normal: "credit" },
  { code: "3900", name: "Laba Ditahan", kelompok: "Ekuitas", normal: "credit" },
  // Pendapatan
  { code: "4100", name: "Penjualan Barang Dagang", kelompok: "Pendapatan", normal: "credit" },
  { code: "4200", name: "Pendapatan Ongkos Kirim", kelompok: "Pendapatan", normal: "credit" },
  { code: "4900", name: "Diskon Penjualan", kelompok: "Pendapatan", normal: "debit" }, // kontra-pendapatan
  // HPP
  { code: "5100", name: "Harga Pokok Penjualan (HPP)", kelompok: "HPP", normal: "debit" },
  { code: "5200", name: "Kerugian Barang Rusak/Retur", kelompok: "HPP", normal: "debit" },
  // Beban
  { code: "6100", name: "Beban Komisi Sales", kelompok: "Beban", normal: "debit" },
  { code: "6200", name: "Beban Ongkos Kirim (Kurir)", kelompok: "Beban", normal: "debit" },
  { code: "6300", name: "Beban Operasional", kelompok: "Beban", normal: "debit" },
  { code: "6900", name: "Beban Lain-lain", kelompok: "Beban", normal: "debit" },
];

export const ACCOUNT_MAP = new Map(ACCOUNTS.map((a) => [a.code, a]));

export function accountName(code: string): string {
  return ACCOUNT_MAP.get(code)?.name ?? code;
}
