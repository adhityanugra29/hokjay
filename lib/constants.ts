// Product categories, couriers, and payment methods are managed by the
// user via /admin and stored in the database (models/Category.ts,
// models/Courier.ts, models/PaymentMethod.ts) — no hardcoded lists here.

export const LOW_STOCK_THRESHOLD = 5;

export const STOCK_REASONS = [
  "Penjualan",
  "Restock",
  "Barang Rusak",
  "Lainnya",
] as const;

export const CASHFLOW_CATEGORIES = [
  "Pembayaran Invoice",
  "Pembelian Stok",
  "Operasional",
  "Lainnya",
] as const;

// Fixed pricing tiers for the "Pesan Produk Custom" estimate formula —
// unrelated to product catalog categories, so this stays a constant.
export type CustomOrderCategoryId = "meja" | "kompor" | "kabinet" | "lainnya";

export const CUSTOM_ORDER_CATEGORIES: {
  id: CustomOrderCategoryId;
  label: string;
  rate: number;
}[] = [
  { id: "meja", label: "Meja / Rak Stainless Steel", rate: 850_000 },
  { id: "kompor", label: "Kompor / Peralatan Masak Custom", rate: 1_450_000 },
  { id: "kabinet", label: "Kabinet / Lemari Stainless", rate: 1_100_000 },
  { id: "lainnya", label: "Lainnya", rate: 950_000 },
];

export const NAV_ITEMS: { href: string; label: string; num: string; color: string }[] = [
  { href: "/", label: "Dasbor", num: "01", color: "#f0a52c" },
  { href: "/katalog", label: "Penjualan", num: "02", color: "#f0a52c" },
  { href: "/invoice", label: "Invoice", num: "03", color: "#e8542e" },
  { href: "/produk", label: "Inventory", num: "04", color: "#12b8a3" },
  { href: "/pelanggan", label: "Pelanggan", num: "05", color: "#6952d6" },
  { href: "/insentif", label: "Insentif Sales", num: "06", color: "#e0392b" },
  { href: "/keuangan", label: "Keuangan", num: "07", color: "#0e7c66" },
  { href: "/admin", label: "Admin", num: "08", color: "#7c7666" },
  { href: "/akuntansi", label: "Akuntansi", num: "09", color: "#6952d6" },
];

export const MONTH_NAMES = [
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
