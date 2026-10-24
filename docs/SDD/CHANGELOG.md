# HOJAY — Change Log

> Newest first. See `TASKS.md`/`BUGS.md` for the full task/bug detail behind each entry.

> Hanya bulan berjalan. Bulan lama: `archive/CHANGELOG-YYYY-MM.md`.

---

## 2026-10-23

**Tambah banyak produk dari foto (TASK-048)** — halaman baru `/produk/baru-massal` (tombol "Bulk Upload Product" di header Inventory): seret banyak foto, lalu isi data tiap foto satu per satu (1 foto = 1 produk, semua wajib diisi). Simpan memakai `POST /api/products` yang sama dengan form biasa; Kategori/Kondisi/Tipe meniru produk sebelumnya, Kategori wajib dipilih; antrean disimpan di `localStorage` untuk dilanjutkan. Preserved: `ProductForm` (hanya `parseProductFilename` di-export), API, skema, uang/stok/komisi. Regression: `tsc` (kecuali tipe global Next yang belum digenerate di worktree) dan `eslint` bersih pada file yang diubah.

**Tombol "Tandai Sudah Kirim" dihapus dari modul Invoice** — daftar invoice (baris + panel detail) dan halaman detail invoice tidak lagi menampilkan tombol; pengiriman ditandai hanya lewat `/pengiriman` (juga Beranda/Follow-up). Pil status "Belum dikirim/✓ Dikirim" tetap. Query Courier & prop `couriers` yang tak terpakai dibuang dari `app/invoice/page.tsx`, `app/invoice/[id]/page.tsx`, `InvoiceListClient`. API `/kirim` dan `TandaiKirimButton` tidak diubah. Regression: `tsc` bersih.

**Kapital di invoice & turunannya (lanjutan TASK-047)** — `namaSnapshot` (produk/custom/jasa) di-uppercase server saat simpan (`createInvoice`, `updateInvoice`, `jasaLine`); tampilan invoice/surat jalan/preview (`buildInvoicePrintData`: item, dimensi, pelanggan, alamat kirim, kurir, catatan), PO, label insentif/payroll, serta kategori (katalog sidebar, katalog cetak, daftar produk) di-uppercase saat render sehingga invoice lama ikut kapital tanpa mengubah DB. Preserved: uang/stok/komisi/jurnal, nama Sales/User, S&K. Regression: `tsc` bersih.

**Auto-kapital input (TASK-047)** — `Input`/`Textarea` (+ input mentah di MobileSupplier, No. Resi, prompt Dialog) mengubah ketikan jadi huruf kapital; `noUppercase` untuk nama User/Sales/Karyawan, S&K, Metode Pembayaran. Skrip `scripts/kapitalkan-data-lama.ts` (dry-run/--apply) untuk data master lama; belum dijalankan. Preserved: logika uang/stok/komisi, snapshot invoice, server/API tidak berubah. Regression: `tsc` bersih.

**Token diet (hemat token & waktu per perubahan)** — (1) `CLAUDE.md` memuat peta arsitektur, aturan uang/stok/komisi/zona waktu, dan gotcha PDF. (2) Dokumen SDD diarsipkan ke `docs/SDD/archive/` (TASKS/BUGS selesai, CHANGELOG bulan lama, riwayat PROJECT_STATE, `INDEX.md`); bacaan wajib awal sesi turun dari ±233 KB ke ±21 KB. (3) Komentar riwayat bertanggal dipangkas di 12 file terbesar (kode identik, diverifikasi dengan pembanding AST). (4) 15 handler API tanpa pemanggil dihapus: GET customers/invoices/products/jasa/purchase-bills/purchase-requests/office-expenses/cashflow/absensi, PATCH couriers/[id], `invoices/[id]/payout`, `products/[id]/restock`, `purchase-requests/[id]`.

Preserved: seluruh fitur UI dan logika uang/stok/komisi. Regression: `tsc`, `npm run build` bersih; lint tidak menambah error. Catatan: `payout` adalah satu-satunya jalan membalik status "komisi cair" lewat API (tanpa UI) dan tidak punya cek role; dipulihkan lewat `git show pre-refactor:app/api/invoices/[id]/payout/route.ts` bila diperlukan.

## 2026-10-22

**Refactor Tahap 2** — (1) `buildInvoicePrintData()` di `lib/invoiceDisplay.ts` menggantikan 3 salinan builder (detail, API print, list). (2) `capturePagesToPdf()` di `lib/pdfExport.ts` dipakai Katalog & Invoice; `formatDateDMY()` di `lib/format.ts`. (3) `SimpleNameManager` menggantikan isi CourierManager/PaymentMethodManager. (4) `periodRange`/`currentPeriod`/`MONTH_NAMES`/`Chevron` jadi satu sumber. (5) Invoice list: `printData` tidak lagi dikirim per baris — Preview mengambilnya saat dibuka lewat `useInvoicePrintData` (`/api/invoices/[id]/print`, kini juga memuat URL bukti transfer).

Perubahan perilaku (disetujui): Preview invoice di list punya jeda loading singkat; periode Payroll (Gaji, bayar gaji karyawan) kini memakai batas bulan WIB seperti Insentif, bukan jam server. Preserved: semua fitur lain. Regression: `tsc`, `npm run build` bersih; error lint 44 → 43 (tidak ada yang baru).

**Cleanup Tahap 1** — Hapus kode/file mati: 6 komponen tak terpakai (HotProductsCarousel, InvoicePeriodFilter, MobileGajiBulanan, payroll/tabs, MenuTile, RankBadge), `downloadReportPdf`/`reportTableStyle`, `getLowStockProducts`/`countLowStockProducts`, shim re-export di InvoicePrintDoc, prop mati StatCard (`accent`, `deltaTone`), `reference/preview-ui.html`, mockup lama, script `freeze-syarat-ketentuan`, `server.js`/`.cpanel.yml` (deploy = Vercel), svg bawaan Next.

Preserved: semua fungsi aplikasi (tidak ada perubahan perilaku). Regression: `tsc --noEmit` bersih; lint tidak menambah error. Belum dikerjakan: Tahap 2 (gabung duplikasi) menunggu approval.

**TASK-046** — Halaman Pengiriman `/pengiriman` dibuat (mockup `pengiriman-v1.html`): kolom Status, Jadwal Kirim, Tgl Kirim; tab Perlu Dikirim / Sudah Dikirim; filter bulan, kurir, pembayaran, pencarian; No. Resi opsional di modal Tandai Dikirim; menu titik tiga per baris; item Pengiriman (ikon truk) di grup Jualan, Purchasing pindah ke ikon kantong belanja. Mockup: `pengiriman-v1.html`.

Link `/follow-up?view=kirim` dan "lihat semua" di Beranda kini mengarah ke `/pengiriman`. Field baru `Invoice.noResiKirim`; Purchasing memakai ikon kantong belanja.

Preserved: aturan urutan Perlu Dikirim, Surat Jalan/PDF, arti `dikirim`, tampilan default Follow-up. Removed: `PerluDikirimView` (diganti halaman baru). Regression: tsc, eslint, build bersih; belum diklik di browser yang login. Belum: Surat Jalan di menu titik tiga, badge angka di menu.

---

## 2026-10-18

**TASK-045** — Batas Syarat & Ketentuan per poin naik dari 300 ke 1000 karakter. Ditambah batas total 3500 karakter (15 poin tetap) agar S&K tidak melebihi satu halaman dan terpotong di PDF; form menampilkan penghitung pemakaian.

Preserved: tampilan/cetak invoice dan Surat Jalan, invoice lama. Regression: tsc dan eslint bersih; belum diuji dengan PDF nyata dan belum diklik di browser.

---

## 2026-10-13

**BUG-025** — Unduh Katalog PDF memuat produk yang tidak dicentang: sisa pilihan dari sesi sebelumnya (tersimpan di browser) ikut terbawa saat klik "Buat Katalog". Sekarang setiap sesi "Buat Katalog" mulai dari 0 centang.

Preserved: pilihan lintas pencarian dalam satu sesi, harga custom, diskon. Regression: tsc bersih; belum diklik di browser yang login.

---

## 2026-10-12

**TASK-044** — Syarat & Ketentuan bisa diatur per invoice: seksi baru di paling bawah form invoice (isi awal dari template Admin → Invoice, bisa diubah per baris, "Kembalikan ke default"). Draft ikut template selama belum diubah; saat invoice dikirim teksnya dibekukan, sehingga perubahan template tidak mengubah invoice Belum bayar/DP/Lunas. Lunas tidak bisa diubah. Halaman Admin → Invoice kini berjudul "Template Default Syarat & Ketentuan". Mockup: `invoice-syarat-ketentuan-v1.html`.

Perlu dijalankan sekali: `npm run freeze-syarat-ketentuan -- --apply` (dry run dulu tanpa flag) agar invoice lama tidak ikut berubah saat template diedit.
Preserved: tampilan/cetak invoice, Surat Jalan, pengaturan template. Regression: tsc bersih; belum diklik di browser yang login.

**UX fix (halaman detail invoice)** — "Catat DP" kembali jadi tombol terlihat di bawah "Tandai Lunas" (sebelumnya tersembunyi di "Aksi lainnya" sejak TASK-039, sales tidak menemukannya). Aturan tampil tidak berubah: Belum bayar dan belum ada DP. Tidak ada perubahan logika DP.

---

## 2026-10-09

**TASK-043** — Katalog: produk yang baru diupload (7 hari terakhir, kondisi Baru maupun Bekas) mendapat banner hijau "NEW STOCK" dan dikumpulkan di section "New Stock" di atas grid, tanpa hitungan hari; hilang otomatis setelah 7 hari. Filter "Hanya Produk Baru" (3 hari) tidak berubah. Mockup: `docs/SDD/mockups/katalog-barang-baru-v1.html`.

Preserved: Flash Sale, filter, infinite scroll, Pilih Semua, PDF katalog. Regression: tsc, eslint, next build bersih; belum diklik di browser yang login.

---

## 2026-10-08

**BUG-024** — Pencarian Katalog (mis. "cabinet") hanya menampilkan 12 produk pertama karena scroll otomatis tidak memuat halaman berikutnya setelah pencarian dengan hasil sedikit. Diperbaiki dengan memantau ulang penanda scroll.

Regression: tsc dan eslint bersih; belum diklik di browser yang login.

---

## 2026-10-07

**TASK-042** — Fitur Jasa (biaya service): master data terpisah dari produk (tab Jasa di Inventory), ditambahkan lewat invoice atau tombol "+ Tambah" di Katalog. Harga flat diinput per invoice, tanpa qty/stok/diskon/komisi/HPP; pendapatan masuk akun baru 4-1200 Pendapatan Jasa dan tampil di Laba Rugi. Header Katalog disederhanakan jadi "+ Tambah" dan Buat Katalog. Mengikuti mockup `jasa-v2.html`.

Tasks: TASK-042.
Regression: tsc dan next build bersih; belum diklik di browser yang login. Belum diputuskan: apakah jasa ikut total penjualan di Leaderboard Insentif.

---

## 2026-10-02

**TASK-039** — Detail invoice dirapikan sesuai mockup v7: satu kartu utama (total, status, maksimal 2 tombol langkah), ikon Kirim WA dan Unduh Invoice di pojok kanan atas dokumen, dan "Aksi lainnya" (Surat Jalan, Catat DP, Ubah, Hapus) di kartu yang sama. Header tidak lagi berisi tombol.

Tasks: TASK-039.
Regression: tsc, eslint, next build bersih; belum diklik di browser yang login.

---

**TASK-041** — Daftar Invoice dirapikan: baris berkolom tetap, panah detail (Sales/Item/Kurir/Ubah/Hapus), ikon Preview dan WA menggantikan menu ⋯, pengelompokan "Perlu tindakan" dan "Selesai" di tab Semua, tombol Filter dengan chip, dan dua kartu ringkasan jadi satu baris. Mengikuti mockup yang disetujui.

Tasks: TASK-041.
Regression: tsc, eslint, next build bersih; belum diklik di browser yang login. Ikon Unduh PDF di detail baris belum dibuat (Unduh tetap di Preview).

---

**TASK-040 (mockup)** — Laporan Owner: Rekomendasi tindakan dibangun ulang berbasis statistik inferensial (uji Welch, rentang Wilson 95%, regresi tren, peluang capai target, batas wajar piutang) dengan label keyakinan dan bahasa awam; tren sales di Kuartal/Tahun jadi batang per bulan. Percobaan pertama yang mengubah seluruh Ringkasan jadi inferensial dikembalikan atas koreksi user; bagian lain tetap deskriptif. Tidak ada perubahan kode app.

Tasks: TASK-040.
Regression: mockup dijalankan di Node (DOM stub) untuk 3 mode periode; belum dicek di ponsel/mode gelap.

---

## 2026-10-01

**BUG-023 fixed** — Leaderboard's month boundaries (and Beranda's "bulan ini" period) now use GMT+7 instead of server-local time, so an invoice paid just after midnight WIB on the 1st lands in the right month. "Sisa hari" now counts today (the 31st shows 1, not 0). Ranking basis unchanged: lunas by payment date.

Tasks: BUG-023.
Regression: `tsc --noEmit` clean. Not verified against production data.

---

**TASK-038 done** — Payroll (Owner) redesigned to match Komisi Saya's look, mockup-approved first (5 versions). One shared month stepper (`?periode=`) for Gaji, Absensi and Riwayat instead of one per page; Komisi deliberately has no month filter (unpaid commission is a running balance); Karyawan has none (a roster has no period). Komisi/Gaji get a summary card, rounded lists, a pay panel (sticky bottom bar on phones); Riwayat is cards grouped by month paid; Karyawan and Absensi restyled (switches, day strip). Tapping an invoice number in Komisi/Riwayat drawers opens an invoice PDF preview with "Unduh PDF" (new `GET /api/invoices/[id]/print`). No capability removed; payment logic untouched.

Tasks: TASK-038.
Regression: `tsc --noEmit`, `eslint`, `next build` clean (one pre-existing lint error in `KaryawanManager` left as is). Not click-tested in a logged-in browser.

---

**TASK-037 done** — Invoice detail's Riwayat card now also shows when that invoice's commission was paid out ("Komisi dibayarkan ke {sales}", dated `komisiCairTanggal`), per the user's request. Derived at render time (no payout-route change, no backfill; all 38 existing paid-out invoices have the date), appended last so existing lines keep their order, and not added to the customer-facing PDF.

Tasks: TASK-037.
Regression: `tsc --noEmit`, `eslint` clean. Not click-tested in a logged-in browser.

---

**TASK-036 follow-up (concept fix)** — Komisi Saya's numbers were ambiguous after the label rename (labels on the wrong figures). Per the user's definitions: **Komisi Siap Cair** = invoice lunas, commission not yet transferred (now the one big figure); **Komisi Tertunda** = invoice not yet lunas (small secondary line + tab, never in the headline). The "already transferred" figure was removed (it's in Riwayat pembayaran). Both are balances up to the end of the selected month. Re-mocked first (artifact v5).

Tasks: TASK-036.
Regression: `tsc --noEmit`, `eslint`, `next build` clean; data function re-run read-only against the real DB. Not click-tested in a logged-in browser.

---

**TASK-036 done** — Komisi Saya (Sales/Manager) redesigned after the user's question whether it had a period filter, a modern layout and payment history (it had none). Mockup-approved over 4 iterations. Added a ‹ month › period stepper, a lunas-only headline figure (the old total also summed unpaid invoices — "terkesan menipu"), per-invoice status (Lunas / Sudah DP / Belum Bayar) with a "Lihat invoice" link, and a payout history (per transfer, expandable, bukti transfer link). Unpaid/not-yet-transferred invoices now carry over between months instead of vanishing. Removed on the user's instruction: the "Tagih" buttons and the mini Papan Peringkat on this page only.

Tasks: TASK-036. Bugs fixed: BUG-022.
Preserved: Slip Gaji (`/payroll`), Leaderboard (`/insentif`), `/follow-up`, `getMyCommissionSummary` (Beranda still uses it).
Regression: `tsc --noEmit`, `eslint`, `next build` clean; new data function run read-only against the real DB. Not click-tested in a logged-in browser.

---

**TASK-034 follow-up** — Kondisi (Baru/Bekas) badge collided with `ZoomableImage`'s own dimension footnote — both sat at the photo's bottom-left corner. Moved Kondisi to top-left instead, nudged right when the pick-mode checkbox is also showing there. Verified via a static HTML reproduction of the 3 overlapping states (no logged-in browser session available in this environment to click through Katalog live).

Tasks: TASK-034.
Regression: `tsc --noEmit` clean.

---

