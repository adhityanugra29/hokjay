/**
 * Chart of Accounts — corporate-style numbering ("1-1000" etc.) adapted from
 * the COA template the user supplied 2026-08-23, itself adapted for this
 * app's actual Mongoose data model (no formal Purchase Order flow, no tax;
 * see lib/services/journal.ts for what's actually wired up) and for a
 * trading/reseller business rather than a manufacturer — the template's
 * manufacturing-only HPP subcategories (bahan baku, tenaga kerja langsung,
 * overhead pabrik) don't apply here, so HPP stays a single line like before.
 *
 * Renamed from the old flat 4-digit codes (1101, 4100, 6300, ...) — every
 * existing JournalEntry/CashflowEntry in the database was migrated to these
 * new codes in the same change (see the one-off migration run 2026-08-23),
 * so old and new data aggregate together correctly. Do not reintroduce a
 * 4-digit code — accountName()/getTrialBalance() key strictly off `code`.
 */
export type AccountKelompok =
  | "Aset"
  | "Kewajiban"
  | "Ekuitas"
  | "Pendapatan"
  | "HPP"
  | "Beban"
  // Non-operating expenses (COA group 7 in the template) — kept apart from
  // "Beban" so Laba Rugi can subtotal "Laba Usaha" before subtracting these,
  // matching a corporate multi-step income statement. See lib/akuntansi.ts.
  | "Beban Non-Operasional";

export interface Account {
  code: string;
  name: string;
  kelompok: AccountKelompok;
  /** Normal balance side — Aset & Beban & HPP are debit-normal, the rest credit-normal. */
  normal: "debit" | "credit";
}

export const ACCOUNTS: Account[] = [
  // 1 — Aset
  { code: "1-1100", name: "Kas", kelompok: "Aset", normal: "debit" },
  { code: "1-1200", name: "Bank", kelompok: "Aset", normal: "debit" },
  { code: "1-2000", name: "Piutang Usaha (AR)", kelompok: "Aset", normal: "debit" },
  { code: "1-3000", name: "Persediaan Barang Dagang", kelompok: "Aset", normal: "debit" },
  // 2 — Liabilitas / Kewajiban
  { code: "2-1000", name: "Utang Komisi Sales", kelompok: "Kewajiban", normal: "credit" },
  // Real cash received (DP) before revenue is recognized — a liability
  // until the invoice reaches "lunas", at which point it's cleared against
  // the sale (see postInvoiceLunas in lib/services/journal.ts). Added
  // 2026-08-27 when revenue/HPP/komisi recognition moved from
  // invoice-finalize time to invoice-paid time, so DP could no longer
  // correctly credit Piutang (which by then hasn't been debited yet).
  { code: "2-2000", name: "Uang Muka Pelanggan", kelompok: "Kewajiban", normal: "credit" },
  // 3 — Ekuitas / Modal
  { code: "3-1000", name: "Modal Pemilik", kelompok: "Ekuitas", normal: "credit" },
  { code: "3-1500", name: "Prive / Penarikan Pemilik", kelompok: "Ekuitas", normal: "credit" },
  { code: "3-2000", name: "Laba Ditahan", kelompok: "Ekuitas", normal: "credit" },
  // 4 — Pendapatan
  { code: "4-1000", name: "Penjualan Barang Dagang", kelompok: "Pendapatan", normal: "credit" },
  { code: "4-1100", name: "Pendapatan Ongkos Kirim", kelompok: "Pendapatan", normal: "credit" },
  { code: "4-1900", name: "Diskon Penjualan", kelompok: "Pendapatan", normal: "debit" }, // kontra-pendapatan
  { code: "4-2000", name: "Pendapatan Lain-lain", kelompok: "Pendapatan", normal: "credit" },
  // 5 — Harga Pokok Penjualan
  { code: "5-1000", name: "Harga Pokok Penjualan (HPP)", kelompok: "HPP", normal: "debit" },
  { code: "5-1900", name: "Kerugian Barang Rusak/Retur", kelompok: "HPP", normal: "debit" },
  // 6 — Beban Operasional (Penjualan & Pemasaran + Umum & Administrasi)
  { code: "6-1000", name: "Beban Komisi Sales", kelompok: "Beban", normal: "debit" },
  { code: "6-1100", name: "Beban Ongkos Kirim (Kurir)", kelompok: "Beban", normal: "debit" },
  { code: "6-2000", name: "Beban Operasional", kelompok: "Beban", normal: "debit" },
  { code: "6-2100", name: "Beban Gaji", kelompok: "Beban", normal: "debit" },
  // 7 — Beban Non-Operasional
  { code: "7-1000", name: "Beban Lain-lain", kelompok: "Beban Non-Operasional", normal: "debit" },
];

export const ACCOUNT_MAP = new Map(ACCOUNTS.map((a) => [a.code, a]));

export function accountName(code: string): string {
  return ACCOUNT_MAP.get(code)?.name ?? code;
}

/**
 * Accounts a user can pick by hand on the manual cashflow form (see
 * components/keuangan/TransactionForm.tsx) — deliberately excludes accounts
 * that only ever get touched by automated postings (Kas/Bank/Piutang
 * themselves, Utang Komisi, Penjualan, HPP, Beban Komisi Sales), so manual
 * entries can't accidentally corrupt those.
 */
export const MANUAL_EXPENSE_ACCOUNT_CODES = ["1-3000", "6-1100", "6-2000", "6-2100", "7-1000"];
export const MANUAL_INCOME_ACCOUNT_CODES = ["4-2000", "3-1000"];

export function manualExpenseAccounts(): Account[] {
  return MANUAL_EXPENSE_ACCOUNT_CODES.map((c) => ACCOUNT_MAP.get(c)!).filter(Boolean);
}

export function manualIncomeAccounts(): Account[] {
  return MANUAL_INCOME_ACCOUNT_CODES.map((c) => ACCOUNT_MAP.get(c)!).filter(Boolean);
}
