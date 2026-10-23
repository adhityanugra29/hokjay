# HOJAY — Task Registry

> Source of truth for project tasks. Never silently delete a task — mark CANCELLED with a reason instead. Statuses: BACKLOG / READY / IN PROGRESS / BLOCKED / REVIEW / TESTING / DONE / CANCELLED.

> Hanya tugas yang belum selesai (IN PROGRESS / BACKLOG / REVIEW / TESTING) ada di file ini. Tugas DONE dipindah ke `archive/` (peta satu-baris: `archive/INDEX.md`; cari detail dengan `grep -rn "TASK-0NN" docs/SDD/archive`). Jangan hapus tugas diam-diam.

---

## TASK-047 — Auto-kapital semua input teks + migrasi data lama

**Type:** UX / Data
**Priority:** P2
**Status:** TESTING
**Created:** 2026-10-23 · **Last updated:** 2026-10-23

**Description:** Input teks di semua form otomatis HURUF KAPITAL (`Input`/`Textarea` di `components/ui/Form.tsx`, prop `noUppercase` untuk pengecualian; `autoCapitalize="characters"` untuk keyboard ponsel). Dikecualikan: email/password/angka/tanggal/pencarian, nama User/Sales/Karyawan (dicocokkan persis ke `Invoice.sales.nama` / slip gaji), S&K, nama Metode Pembayaran (`metode === "Tunai"` menentukan akun kas di `lib/services/journal.ts`). Skrip `npm run kapitalkan-data-lama` (dry-run default, `--apply` untuk menulis) mengkapitalkan data master lama (Produk, Kategori + cascade `Product.category`, Jasa, Supplier, Pelanggan, Aset Kantor); transaksi/snapshot tidak disentuh.

**Subtasks:**
- UI auto-kapital — selesai (tsc bersih), belum diuji manual di browser.
- Migrasi data lama — skrip siap, BELUM dijalankan. Backup DB dulu; jalankan dry-run, periksa bentrok kategori, baru `--apply`, SETELAH UI ini ter-deploy.

---

## TASK-002 — "Foundry" end-to-end sweep: remaining stiff pages

**Type:** UX/UI
**Priority:** P2
**Status:** IN PROGRESS
**Dependency:** TASK-001
**Created:** 2026-08-30 · **Last updated:** 2026-08-30

**Description:** The user asked explicitly not to skip any page ("saya tidak mau ada page yang terlewat"). Go module by module finding hard `border-2 border-ink`, bare `rounded` (computes to 0px), and hidden yellow-on-white contrast bugs, applying the same treatment already proven on Katalog/Pelanggan/Inventory/Invoice.

**Subtasks:**
- SUBTASK-001 Invoice + Inventory end-to-end — DONE (list pages, detail sidebars, PaymentForm/DpForm, Kategori/Riwayat).
- SUBTASK-002 Insentif leaderboard contrast (Dialog.tsx too, found along the way) — DONE.
- SUBTASK-003 Dashboard (`app/page.tsx`) — DONE.
- SUBTASK-004 Keuangan — DONE.
- SUBTASK-005 Akuntansi — DONE.
- SUBTASK-006 Purchasing — TODO.
- SUBTASK-007 Payroll — TODO.
- SUBTASK-008 Admin — TODO.

**Acceptance criteria:** Same as TASK-001, applied per module; `grep -rln "border-2 border-ink"` across `app/`+`components/` returns only intentionally-document-styled surfaces (print docs, the invoice-preview `#invoice-doc`, ledger-style totals dividers).

**Files affected:** TBD per subtask.

---

## TASK-004 — Billing plan for Owner Hojay

**Type:** DOCUMENTATION / NON-CODE
**Priority:** P3
**Status:** BACKLOG (explicitly scheduled for AFTER TASK-002 and open bugs are done — "setelah bug selesai dan layar sudah diperbaharui")
**Dependency:** TASK-002 (must reach DONE first), BUGS.md (no open B0-B2 bugs)
**Created:** 2026-08-30 · **Last updated:** 2026-08-30

**Description:** Prepare a plan/document the user (developer) can use to bill/invoice CV Horeca Jaya's Owner for the work completed — likely a scope-of-work summary covering the Foundry UI rework + bug fixes done this session (and possibly earlier). Not yet scoped in detail (format, whether it's a rate/hours breakdown or a flat description of deliverables) — needs a short requirements check with the user once TASK-002 wraps up, before drafting.

**Acceptance criteria:** TBD once scoped.

**Files affected:** None (not application code) — likely a standalone document/artifact, not a repo file.

---

## TASK-040 — Laporan Owner (mockup): "Rekomendasi tindakan" berbasis statistik inferensial + tren per bulan untuk Kuartal/Tahun

**Type:** UX/UI + Analytics (mockup only, belum ada kode di app)
**Priority:** P3
**Status:** REVIEW — mockup HTML sudah jadi dan dipublikasikan, menunggu keputusan user soal arah/implementasi ke app HOJAY
**Dependency:** Laporan HOJAY versi deskriptif (artifact https://claude.ai/artifact/YN2xJiWGSA2zokFMjHAZ3i, dibuat 2026-09-30, 4 tab: Ringkasan / Sales / Operasional / Produktivitas, data contoh 21 bulan)
**Created:** 2026-10-02 · **Last updated:** 2026-10-02

**Description:** User ingin dasbor Owner ("Laporan HOJAY") memakai metode statistik. Versi pertama = Statistik Deskriptif (artifact di atas). Permintaan lanjutan 2026-10-02:
1. **Rekomendasi tindakan** (tab Ringkasan) dibuat berbasis **statistik inferensial**, dengan bahasa awam supaya Owner cepat mengambil keputusan. Hanya bagian ini yang berubah — bagian lain Ringkasan (KPI, scorecard 3 kelompok, Potensi penjualan) tetap deskriptif seperti semula. (Percobaan pertama salah: seluruh Ringkasan diubah jadi inferensial; user mengoreksi dan minta dikembalikan, kecuali rekomendasi.)
2. **Tren sales** di tab Sales: saat periode Kuartal/Tahun, grafik harian diganti **batang per bulan** (vs bulan yang sama di periode lalu + garis target bulanan tim); mode Bulan tetap harian.

**Metode inferensial yang dipakai di rekomendasi:** peluang capai target (proyeksi laju harian 28 hari × sisa hari, rentang 95%); uji beda Welch (omzet vs periode lalu, diskon per sales vs sales lain, margin per produk vs produk lain); regresi linear 12 bulan (tren, rentang slope 95%); rentang Wilson 95% vs target (ketepatan kirim, kecepatan bayar ≤7 hari, konversi invoice→lunas, ketepatan PO supplier); uji dua persentase (kurir, konversi per sales); batas wajar piutang = persentil ke-95 waktu lunas 12 bulan; pelanggan langganan "lebih lama dari kebiasaannya" (jeda rata-rata + 2 simpangan baku). Tiap rekomendasi diberi label keyakinan: **Yakin / Cukup yakin / Belum pasti / Fakta hari ini** + baris dasar hitungan.

**Decisions made (user tidak menjawab dua pertanyaan, dipakai default):** cakupan = semua metode di atas; dipublikasikan sebagai artifact baru supaya versi deskriptif tetap utuh.

**Keterbatasan / hal yang perlu dicek sebelum dipakai di app:** semua angka masih **data contoh** (seeded, 21 bulan, s.d. 24 Sep 2026), target layanan (kirim 90%, lunas 7 hari, PO 85%, hari persediaan 90, biaya tenaga kerja 7%, konversi 80%) dan target per sales adalah angka contoh. Omzet harian punya pola hari + tren sehingga asumsi uji (independen/normal) hanya perkiraan kasar — validasi ulang dengan data HOJAY nyata. Dengan target contoh, "peluang capai target" di Kuartal/Tahun terbaca ~0%.

**Open decisions:** (a) apakah tab Laporan ini akan dibangun di app HOJAY (route/role Owner) atau tetap sebagai artifact; (b) bagaimana target bulanan/per sales disimpan (belum ada model); (c) apakah Sales/Operasional/Produktivitas ikut dijadikan inferensial.

**Files affected:** none in app code. Mockup: `docs/SDD/mockups/laporan-inferensial.html` (salinan lokal, bisa dibuka di browser). Published artifact (private): https://claude.ai/artifact/QzqXwcqd2nRyMEJhvtiRg6 (versi 3).

**Regression test:** mockup dijalankan di Node dengan DOM stub untuk mode Bulan/Kuartal/Tahun (sintaks OK, rekomendasi dan grafik terisi). Belum dilihat di layar ponsel / mode gelap.


---

## TASK-044 — Syarat & Ketentuan per invoice (template default tetap di Admin → Invoice)

**Type:** Feature
**Priority:** P2
**Status:** TESTING (2026-10-12; kode selesai, belum diklik di browser yang login; NB: `scripts/freeze-syarat-ketentuan.ts` dihapus saat cleanup 2026-10-22 — pulihkan via `git show pre-refactor:scripts/freeze-syarat-ketentuan.ts`; skrip pembekuan data lama belum dijalankan)
**Dependency:** Pengaturan.syaratKetentuan (2026-09-19), TASK-042 (pola InvoiceForm)
**Created:** 2026-10-12 · **Last updated:** 2026-10-12

**Requirement (user):** S&K di invoice sebelumnya satu teks global dari Admin → Invoice. Sekarang bisa diatur per invoice, di bagian paling bawah form invoice (setelah item/ringkasan), dengan isi awal dari template Admin → Invoice. Mockup: `docs/SDD/mockups/invoice-syarat-ketentuan-v1.html`.

**Rules (disetujui user):**
- Semua role (Sales, Admin, Owner) boleh mengubah; mengikuti hak edit invoice yang ada (guard per-sales tetap).
- Mengubah S&K di invoice hanya berlaku untuk invoice itu; template global tidak pernah ditulis dari form invoice.
- Draft: ikut template selama belum diubah manual. Saat invoice dikirim (Belum bayar), teks yang berlaku dibekukan di invoice dan tidak ikut perubahan template lagi. DP dan Lunas sama (sudah dibekukan).
- Belum bayar dan DP boleh diubah S&K-nya, hanya di invoice itu. Lunas tidak bisa diubah (halaman ubah 404, `updateInvoice` menolak).
- Semua poin dihapus berarti invoice tanpa S&K (`""`), berbeda dari "ikut template" (`undefined`).
- Batas yang saya usulkan (belum dibantah user): maksimal 15 poin, 300 karakter per poin; hanya berlaku untuk teks custom.

**Impact: LOW-MEDIUM.** ADD field `Invoice.syaratKetentuan` (opsional), ADD helper `lib/syaratKetentuan.ts` dan `lib/services/syaratKetentuan.ts`, EXTEND `createInvoice`/`updateInvoice`, EXTEND 4 tempat `printData` (fallback `invoice.syaratKetentuan ?? template`), ADD `SyaratKetentuanEditor` di `InvoiceForm`, ubah label/teks halaman Admin → Invoice. Komponen cetak (`InvoicePrintDoc`/`InvoiceDocument`) tidak diubah.

**Data lama:** invoice non-draft yang belum punya S&K sendiri masih ikut template sampai dibekukan. `scripts/freeze-syarat-ketentuan.ts` (`npm run freeze-syarat-ketentuan`, default dry run, `-- --apply` untuk menulis) menyalin template saat ini ke invoice tersebut. Jalankan SEKALI sebelum template pertama kali diubah.

**Files affected:** `models/Invoice.ts`, `lib/syaratKetentuan.ts`, `lib/services/{syaratKetentuan,createInvoice,updateInvoice}.ts`, `components/invoice/{SyaratKetentuanEditor,InvoiceForm,EditInvoiceLoader}.tsx`, `components/admin/PengaturanSyaratKetentuan.tsx`, `app/invoice/{page.tsx,baru/page.tsx,[id]/page.tsx,[id]/ubah/page.tsx}`, `app/api/invoices/[id]/print/route.ts`, `scripts/freeze-syarat-ketentuan.ts`, `package.json`.
**Files NOT changed:** `InvoicePrintDoc`, `InvoiceDocument`, Surat Jalan (memakai `catatan`, bukan S&K), model Pengaturan, API pengaturan.
**Acceptance criteria:** invoice baru terisi template; edit custom hanya mengubah invoice itu; template diubah tidak mengubah invoice Belum bayar/DP/Lunas/custom, tetapi mengubah draft yang belum diubah; Lunas tidak bisa diubah; invoice lama tampil sama; PDF multi-halaman tetap benar.
**Regression test:** `tsc --noEmit` dan `next build` bersih; ESLint pada file yang diubah hanya melaporkan 2 temuan lama di InvoiceForm (setState di effect). Belum diklik di browser yang login.
**Open points:** (1) batas 15 poin/300 karakter menunggu konfirmasi. (2) Skrip pembekuan harus dijalankan di database produksi sebelum template diubah. (3) Invoice Belum bayar yang disimpan kembali sebagai draft tetap membawa teks beku (tidak kembali ikut template).

---

## TASK-045 — Batas karakter per poin Syarat & Ketentuan naik 300 → 1000 (format PDF tetap aman)

**Type:** Enhancement
**Priority:** P3
**Status:** TESTING (2026-10-18; kode selesai, `tsc` dan `eslint` bersih, belum diuji dengan PDF nyata)
**Dependency:** TASK-044, TASK-032 (aturan penempatan S&K di PDF)
**Created:** 2026-10-18 · **Last updated:** 2026-10-18

**Requirement (user):** Batas karakter per poin S&K dinaikkan menjadi 1000, tanpa merusak format sebelumnya.

**Keputusan:** Menaikkan batas per poin saja bisa membuat blok S&K lebih tinggi dari satu halaman A4 (15 × 1000), dan `InvoicePrintDoc` memotong apa pun di luar satu halaman (lihat TASK-032). Karena itu ditambah batas total `SK_MAX_CHARS_TOTAL = 3500` (perkiraan ≈108 karakter mono per baris, ≈45 baris per halaman) agar S&K tetap muat di satu halaman khusus. Batas 15 poin tidak berubah.

**Impact: LOW.** Hanya konstanta dan validasi; komponen cetak (`InvoicePrintDoc`, `InvoiceDocument`) tidak diubah. Invoice yang sudah ada tidak berubah. Validasi hanya berjalan saat simpan.

**Files affected:** `lib/syaratKetentuan.ts` (`SK_MAX_CHARS_PER_POIN` 1000, `SK_MAX_CHARS_TOTAL` baru, `validateSyarat`), `components/invoice/SyaratKetentuanEditor.tsx` (`maxLength` mengikuti sisa kuota total, teks bantuan dengan penghitung).
**Regression test:** `tsc --noEmit` dan `eslint` pada dua file yang diubah bersih. Belum diuji dengan PDF nyata (15 poin berisi penuh, dengan dan tanpa Catatan panjang) dan belum diklik di browser.
**Open points:** (1) Angka 3500 adalah perkiraan hitungan, belum diukur di PDF; perlu dites lalu disesuaikan. (2) Template di Admin → Invoice juga memakai `validateSyarat`, jadi batas totalnya berlaku di sana. Invoice atau template lama yang S&K-nya lebih dari 3500 karakter akan ditolak saat disimpan ulang sampai dipersingkat.

---

## TASK-046 — Halaman Pengiriman (`/pengiriman`): status, jadwal & tgl kirim, filter bulan, No. Resi opsional

**Type:** Feature (UI baru)
**Priority:** P2
**Status:** TESTING (2026-10-22; kode selesai, tsc/eslint/build bersih, belum diklik di browser yang login)
**Dependency:** TASK-026 (`shippingUrgency`, "Perlu Dikirim"), TASK-039 (pengiriman dan pembayaran terpisah), TASK-041 (pola daftar), TASK-018 (Surat Jalan)
**Created:** 2026-10-22 · **Last updated:** 2026-10-22

**Requirement (user):** Halaman khusus untuk pengiriman. Mockup: `docs/SDD/mockups/pengiriman-v1.html` (commit `96cddc7`), Artifact https://claude.ai/artifact/71NbVGRSzv15qrRvAxwg4x (privat, 6 versi).

**Existing system:** Tidak ada model pengiriman terpisah; semuanya di `Invoice` (`tanggalKirim` = jadwal, `dikirim`, `tanggalDikirimAktual`, `dikirimOleh`, `kurir`, `ongkosKirim`, `shipAddress`, `catatan`). Tampilan terdekat adalah `/follow-up?view=kirim` (`PerluDikirimView`, `getShippingPriorityInvoices`, `shippingUrgency` di `lib/dashboard.ts`). "Tandai Dikirim" lewat `TandaiKirimButton` dan `PATCH /api/invoices/[id]/kirim`. Draft tidak bisa ditandai terkirim; Sales hanya melihat invoice miliknya. `payment.noResi` adalah nomor bukti bayar, bukan resi kirim.

**Keputusan user (mockup):**
- Cakupan memakai data yang ada, tanpa status perjalanan dan tanpa field driver.
- Halaman baru **menggantikan** tampilan `?view=kirim` di Follow-up.
- Kolom paling kiri bernama **Status** (bukan Urgensi): Terlambat N hari / Kirim Hari Ini / Besok / Kirim {tgl} / Belum Dijadwalkan; di tab Sudah Dikirim = Terkirim. Lalu kolom **Jadwal Kirim** (`tanggalKirim`) dan **Tgl Kirim** (`tanggalDikirimAktual`).
- Dua tab: Perlu Dikirim, Sudah Dikirim. Urutan Perlu Dikirim: Lunas, Sudah DP, Belum Bayar, lalu urgensi (sama seperti `getShippingPriorityInvoices`).
- Filter: pencarian (pelanggan, no. invoice, kota, resi), **bulan** (Perlu Dikirim memakai Jadwal Kirim, Sudah Dikirim memakai Tgl Kirim; invoice tanpa jadwal tidak muncul saat satu bulan dipilih; default "Semua bulan"), kurir, pembayaran.
- **No. Resi** diinput di modal Tandai Dikirim, **opsional**. Tampil di bawah nama kurir di tab Sudah Dikirim dan bisa dicari.
- Satu tombol utama per baris (Tandai Dikirim); menu **titik tiga** berisi Lihat Detail, Surat Jalan, Buka Invoice. Di tab Sudah Dikirim tombol Batalkan terlihat langsung.
- Navigasi: item **Pengiriman** di grup Jualan, tepat di bawah Invoice, **ikon truk**, badge = jumlah Terlambat + Kirim Hari Ini. **Purchasing** pindah ke ikon baru **kantong belanja** (`bag`). Di HP muncul di dalam tab Jualan.

**Impact: MEDIUM.** ADD rute `/pengiriman`, ADD field `Invoice.noResiKirim` (opsional string, tidak ada backfill), ADD ikon `bag`. EXTEND `PATCH /api/invoices/[id]/kirim` dan `TandaiKirimButton` (field resi), EXTEND `lib/dashboard.ts` (query Sudah Dikirim + filter bulan), MODIFY `isAllowedPage`, `lib/nav.ts`, `MobileTabBar`, dan arah tautan widget Beranda / `/follow-up?view=kirim`. Perubahan ikon Purchasing hanya tampilan.

**Files affected (rencana):** `models/Invoice.ts`, `app/api/invoices/[id]/kirim/route.ts`, `components/invoice/TandaiKirimButton.tsx`, `app/pengiriman/page.tsx` + komponen baru di `components/pengiriman/`, `lib/dashboard.ts`, `lib/auth/access.ts`, `lib/nav.ts`, `components/layout/{MobileTabBar,NavIcons}.tsx`, `app/follow-up/page.tsx`, widget "Perlu Dikirim" di Beranda.
**Files NOT changed:** model `Courier` dan Admin → Kurir, Surat Jalan (`InvoicePrintDoc`), field pembayaran, arti `dikirim` (boolean tetap), pembatasan draft, aturan Sales hanya invoice sendiri.

**Plan:** (1) approval mockup; (2) field `noResiKirim` + API + modal; (3) query dan halaman `/pengiriman` (desktop tabel, HP kartu, memakai `Panel`, `Pill`, `TandaiKirimButton`); (4) akses + nav + ikon; (5) alihkan `?view=kirim` ke `/pengiriman`; (6) tsc, eslint, build, klik di browser (Admin dan Sales, desktop dan HP).

**Acceptance criteria:** daftar dan urutan sama dengan tampilan lama; Tandai Dikirim menyimpan tanggal, kurir, dan resi (boleh kosong); Batalkan mengembalikan ke Perlu Dikirim dengan jadwal asli; filter bulan, kurir, pembayaran, dan pencarian bekerja di kedua tab; Sales hanya melihat miliknya; semua role yang berhak bisa membuka menu; Purchasing memakai ikon baru; PDF invoice dan Surat Jalan tidak berubah.

**Open points:** (1) Resi butuh field baru di Invoice, keluar dari keputusan awal "tanpa perubahan model". (2) Resi hanya diisi saat Tandai Dikirim; belum ada cara mengisi/mengubahnya sesudahnya. (3) Pembatalan pengiriman: apakah resi dihapus (di mockup hilang). (4) Default filter bulan "Semua bulan" atau bulan berjalan. (5) Hak akses `/pengiriman` untuk Finance dan Purchasing belum diputuskan (Sales, Admin-level jelas). (6) Mockup belum dicek di browser oleh saya; frame desktop bisa digeser di layar sempit.

**Implementasi (2026-10-22):**
- ADD `Invoice.noResiKirim` (opsional); `PATCH /api/invoices/[id]/kirim` menyimpan `noResiKirim` (dipotong 100 karakter) dan menghapusnya saat pengiriman dibatalkan; `TandaiKirimButton` punya kolom "No. Resi (opsional)".
- ADD `lib/pengiriman.ts` (`getPengirimanData`: Perlu Dikirim = `getShippingPriorityInvoices` apa adanya + kota/alamat/catatan/ongkir; Sudah Dikirim = `dikirim:true`, terbaru dulu, maksimal 500), `app/pengiriman/page.tsx`, `components/pengiriman/PengirimanClient.tsx` (tab, kotak ringkasan, filter pencarian/bulan/kurir/pembayaran, tabel desktop + kartu HP, menu titik tiga, Batalkan).
- EXTEND `FollowUpStatusBadge` (prop `label` opsional), `lib/auth/access.ts` (`/pengiriman` terbuka untuk semua role seperti `/follow-up`), `lib/nav.ts` (Pengiriman, ikon truk, di bawah Invoice; Purchasing ikon `bag`), `NavIcons.tsx` (ikon `bag`), link "lihat semua" Beranda → `/pengiriman`.
- Jawaban open points: (3) resi ikut terhapus saat dibatalkan; (4) default "Semua bulan"; (5) semua role boleh membuka, Sales hanya melihat invoice miliknya (aturan data tidak berubah).
- Perbedaan dari mockup: (a) menu titik tiga berisi Lihat Detail dan Buka Invoice; **Surat Jalan belum ada di menu** karena unduhnya butuh dokumen cetak di halaman (tetap lewat detail invoice / daftar Invoice). (b) **Badge angka di menu belum dibuat** (perlu mengubah `app/layout.tsx`, `AppShell`, `app/menu/page.tsx`). (c) Invoice draft tetap muncul di Perlu Dikirim dengan tombol "Lanjutkan", seperti tampilan lama.

**REMOVED (dengan alasan):** `PerluDikirimView` di `app/follow-up/page.tsx` dihapus. WHAT: fungsi tampilan Perlu Dikirim lama. WHY: halaman baru menggantikannya sesuai keputusan user. IMPACT: `/follow-up?view=kirim` kini redirect ke `/pengiriman`; tampilan default Follow-up tidak berubah. ALTERNATIVE: dibiarkan sebagai kode mati. RISK: rendah; `MobileShippingRows.tsx` sekarang tidak dipakai, file dibiarkan.
**Open points tersisa:** (1) Resi hanya bisa diisi saat Tandai Dikirim. (2) Surat Jalan di menu dan badge angka (di atas). (3) Perlu klik di browser: Admin dan Sales, desktop dan HP, termasuk menu titik tiga di baris terbawah dan Batalkan.
