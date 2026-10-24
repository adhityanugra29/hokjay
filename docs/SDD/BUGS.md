# HOJAY — Bug Registry

> Once recorded, a bug is never deleted — only its Status changes. Severity: B0 critical / B1 high / B2 medium / B3 low.

> Hanya bug yang masih terbuka ada di file ini. Bug FIXED ada di `archive/BUGS-FIXED.md` (peta: `archive/INDEX.md`). Bug tidak pernah dihapus — hanya Status-nya yang berubah.

---

## BUG-026 — Semua unggah foto produk gagal: "Band expansion using linear is unsupported"

**Severity:** B1
**Status:** FIXED di branch `feat/produk-massal` (2026-10-23) — **belum di production**; production (`perf/fase4`) masih terkena sampai fix ini dipromosikan.
**Source:** Laporan user (uji wizard Tambah Banyak Produk di preview).

**Description:** `POST /api/upload` dengan `folder=products` selalu gagal 500 ("Band expansion using linear is unsupported"): Tambah Produk, drawer edit Katalog, dan wizard massal.

**Root cause:** Perf 2.12 (`318592a`) mengecilkan `public/logo/hojay-2b-positif.png` menjadi PNG RGB tanpa alpha (3 kanal). `watermarkImage()` memakai `.ensureAlpha().linear([1,1,1,0.1],[0,0,0,0])` dalam satu pipeline sharp; sharp 0.35 menjalankan `linear()` sebelum `ensureAlpha()`, sehingga 4 koefisien dipakai pada gambar 3 kanal.

**Fix:** Dua tahap di `app/api/upload/route.ts`: tahap 1 `ensureAlpha()` → PNG, tahap 2 `linear()` pada hasilnya. Diverifikasi di lokal untuk logo 3 kanal dan 4 kanal (alpha rata-rata 25 ≈ 10%) dan komposit foto contoh.

**Files:** `app/api/upload/route.ts`.
**Regression test:** Skrip sharp lokal (logo RGB & RGBA) + eslint; belum diuji lewat browser.
**Catatan:** branch lain yang memuat `318592a` (mis. `perf/seamless`) perlu perbaikan yang sama.
