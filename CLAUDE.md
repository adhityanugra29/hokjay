@AGENTS.md

# HOJAY (CV Horeca Jaya) — ERP internal, UI & istilah domain berbahasa Indonesia

Stack: Next 16.3.1 (App Router, `proxy.ts` = middleware), React 19, Mongoose 9, Tailwind 4, jose (JWT), sharp, @vercel/blob. Deploy: Vercel (`vercel.json` region sin1). **Tidak ada test otomatis.**
Verifikasi: `npx tsc --noEmit`, `npm run build` (hanya type-check), `npx eslint <file>` (baseline ±43 error lama, mis. `react-hooks/set-state-in-effect`; abaikan yang bukan di baris yang diubah).
**BAHAYA:** `npm run seed` menghapus Sales/Product/Customer/Invoice/StockMovement/Cashflow/Counter/Category/Courier/PaymentMethod/JournalEntry di `MONGODB_URI` pada `.env.local` (`scripts/seed.ts`). Jangan jalankan tanpa izin.
Windows: node bisa tidak ada di PATH → tambahkan `C:\Program Files\nodejs`. Baca `node_modules/next/dist/docs/` hanya untuk API Next yang disentuh (`proxy.ts`, `RouteContext`, `await params`).
Docs: baca `docs/SDD/PROJECT_STATE.md` lalu `docs/SDD/TASKS.md` (hanya tugas terbuka). Riwayat: `docs/SDD/archive/` (`INDEX.md`; `grep -rn "TASK-0NN"`). **Jangan buka** `docs/SDD/mockups/` (HTML besar), `lib/wilayah.ts`, `lib/platNomor.ts` (data statis).
Proses (SDD): sebelum coding tulis Requirement/Impact/Files/Plan dan tunggu persetujuan; perubahan minimal, tanpa refactor/penghapusan yang tidak diminta; catat di `TASKS.md` (status) + `CHANGELOG.md`.

## Layout
- `app/<modul>/page.tsx` server component → memanggil `lib/*`; `app/api/**/route.ts` (handler: `export async function PATCH(req, ctx: RouteContext<"/api/x/[id]">)`, `await dbConnect()`, `const { id } = await ctx.params`, `getSession()`).
- `components/<modul>/` UI client (`Mobile*.tsx` = varian ponsel), `components/ui/` primitif (Button, Panel, Form/Field, Dialog, Pill, StatCard, Chevron, SortableHeader, UploadBox…).
- `models/` Mongoose (`models.X || model()`), `lib/` logika, `lib/services/` penulisan DB (create/pay/update/delete invoice, journal, restock), `scripts/` (seed, bootstrap-admin).

## Auth & role
`proxy.ts` → `lib/auth/jwt.ts` (edge-safe) + `lib/auth/access.ts` (murni: prefix halaman per role, prefix API admin-only). `lib/auth/session.ts` server-only: `getSession()` (nullable), `requireSession()` (redirect).
Role = `USER_ROLES` di `models/User.ts`: sales, finance, purchasing, admin, owner, super_admin, manager. `isAdminLevel` = admin|owner|super_admin|manager; manager diblokir dari /akuntansi /payroll /bayar-tagihan dan beberapa tab /admin. Owner-only: setelan komisi (`isKomisiSettingAllowed`), hapus produk, diskon tanpa batas (`createInvoice` `isOwner` dari role session, bukan dari body).
Daftar role juga ada di luar access.ts: `CAN_EDIT_PRODUCT_ROLES`/`CAN_FLASH_SALE_ROLES` (`lib/katalog.ts:15`) dan `FLASH_SALE_ROLES` (`app/api/products/[id]/flash-sale/route.ts:14`) — cek ketiganya bila mengubah role.
Role "sales" hanya melihat invoice/pelanggan miliknya: `lib/invoice-visibility.ts`, `customerVisibilityFilter` (`lib/pelanggan.ts`). `User.nama` harus persis sama dengan nama di roster `Sales` (pencocokan by nama).

## Aturan uang & stok
- Uang = `Number` Rupiah bulat; tampil via `rupiah()` (`lib/format.ts`).
- Invoice `status`: draft | unpaid | paid. DP = unpaid + `dp.nominal` (`lib/services/receiveDp.ts`). Harga, hargaBeli, komisi di item = snapshot.
- Invoice unpaid/DP **tidak** mengubah `Product.stok` ("Booked"/"Sudah DP"). Stok turun + `StockMovement` + jurnal baru terjadi di `payInvoice` (`lib/services/payInvoice.ts`). Stok tersedia = stok − qty booked (`getProductInvoiceStatusMap`, `lib/katalog.ts`).
- Akuntansi: `lib/coa.ts` (kode `"1-1100"`), `lib/services/journal.ts`. Invoice lama (JournalEntry `sumberTipe: "invoice-finalisasi"`) memakai jalur *Legacy di pay/dp/update/delete.
- Tidak ada transaksi Mongo (`startSession` = 0). Nomor invoice `INV-YYYYMM####` dari `lib/counters.ts` (reset bulanan).

## Komisi (3 modul, 3 arti)
`lib/commission.ts` = aturan murni: baru/custom 6%; bekas = max(10% × hargaMinimum, markup di atas floor), override % per produk > kategori > 10 (`resolveKomisiBekasPercent`); `maxDiskonBekas/Baru` membatasi diskon; `allocateBulkDiskon`. Server menghitung ulang saat simpan (`createInvoice.ts`, `updateInvoice.ts`), jangan percaya nilai klien.
`lib/insentif.ts` membaca Invoice (leaderboard, ringkasan Beranda, Komisi Saya, daftar bayar); `lib/payroll.ts` gaji + slip + riwayat; flag pencairan = `Invoice.komisiCair*`. `Product.komisiPercent/komisiNominal` hanya referensi (urutan Hot Products), bukan komisi sebenarnya.

## Tanggal & zona waktu
Semua GMT+7: `lib/timezone.ts`, `lib/payrollPeriod.ts` (`?periode=YYYY-MM`, `periodRange`). Hindari `new Date().toISOString().slice(0,10)` untuk "hari ini" (UTC) dan getMonth() lokal-server (Vercel = UTC).

## PDF (sisi klien)
`lib/pdfExport.ts` `capturePagesToPdf`: html2canvas + jsPDF, satu capture per `[data-print-page]` (A4 tetap 794×1123px, `overflow:hidden`). Dokumen: `components/invoice/InvoicePrintDoc.tsx` (+ Surat Jalan), `components/cart/CatalogPrintDoc.tsx` (dipasang di root layout). Data cetak invoice: `buildInvoicePrintData` (`lib/invoiceDisplay.ts`). Laporan akuntansi memakai html2pdf.js (`DownloadReportButton.tsx`).
Gotcha: html2canvas tidak mengerti `oklab`/`color-mix()` (kelas Tailwind `bg-ink/NN` crash → pakai warna solid/hex di dokumen cetak); `object-fit:cover` memulur, `background-image` blur, `display:none` = kosong (dokumen cetak diletakkan off-screen, bukan disembunyikan; letterbox, jangan crop); S&K dipotong diam-diam jika halaman fixed-height `overflow:hidden` tak mengukur S&K terpisah (`lib/syaratKetentuan.ts`); `useTransition`/`isPending` macet saat navigasi karena komponen unmount — `showLoading()` sengaja tanpa `hideLoading()` (dibersihkan provider saat route berubah).
UI "Soft Trade": `bg-accent` solid wajib `text-ink`; `text-accent` di latar terang wajib `text-accent-700`; bare `rounded` = 0px; permukaan dokumen/ledger sengaja border keras (`KNOWN_ISSUES.md`).

## Di mana X?
Nav: `lib/nav.ts` (+ gating `isAllowedPage`). Katalog: `lib/katalog.ts` + `app/api/katalog`. Pengiriman: `lib/dashboard.ts` (`shippingUrgency`) + `lib/pengiriman.ts`. S&K: `lib/syaratKetentuan.ts` (validasi) + `lib/services/syaratKetentuan.ts` (DB). Format/tanggal: `lib/format.ts`. Konstanta: `lib/constants.ts`.
