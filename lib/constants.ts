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
  "Modal Tambahan",
  "Pendapatan Lain-lain",
  "Lainnya",
] as const;

// Business-type options for Customer.jenisUsaha — helps sales tailor which
// products to offer (e.g. a Cafe needs different equipment than a Katering
// operation). Confirmed with the user 2026-08-22.
export const JENIS_USAHA_OPTIONS = [
  "Restoran",
  "Cafe",
  "Hotel",
  "Katering",
  "Bakery & Pastry",
  "Bar / Lounge",
  "Kantin / Food Court",
  "Dapur Produksi (Central Kitchen)",
  "Toko Kelontong / Ritel",
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

export const NAV_ITEMS: { href: string; label: string; num: string }[] = [
  { href: "/", label: "Dasbor", num: "01" },
  { href: "/penjualan", label: "Penjualan", num: "02" },
  { href: "/invoice", label: "Invoice", num: "03" },
  { href: "/produk", label: "Inventory", num: "04" },
  { href: "/pelanggan", label: "Pelanggan", num: "05" },
  { href: "/insentif", label: "Leaderboard Sales", num: "06" },
  { href: "/bayar-komisi", label: "Bayar Komisi", num: "07" },
  { href: "/keuangan", label: "Keuangan", num: "08" },
  { href: "/akuntansi", label: "Akuntansi", num: "09" },
  { href: "/admin", label: "Admin", num: "10" },
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
