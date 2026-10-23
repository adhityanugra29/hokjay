# HOJAY — Project State

> Baca ini dulu di awal sesi, lalu `TASKS.md` (hanya tugas terbuka). Riwayat lengkap ada di `archive/` (peta satu-baris: `archive/INDEX.md`; detail via `grep -rn "TASK-0NN" docs/SDD/archive`). Arsitektur & aturan kode: `CLAUDE.md`.

**Last updated:** 2026-10-23

## CURRENT STATE

Semua modul utama sudah live di Vercel (`main`). Build/typecheck bersih. Tugas terbuka (detail di `TASKS.md`):

- **TASK-046** TESTING — Halaman `/pengiriman` (status, jadwal/tgl kirim, filter bulan, No. Resi opsional). Kode selesai, belum diklik di browser yang login.
- **TASK-045** TESTING — Batas S&K per poin 1000 karakter + total 3500; belum diuji dengan PDF nyata.
- **TASK-044** TESTING — S&K per invoice (dibekukan saat dikirim). Invoice non-draft lama tanpa S&K sendiri masih mengikuti template sampai dibekukan; skrip `scripts/freeze-syarat-ketentuan.ts` sudah dihapus dari repo saat cleanup 2026-10-22 (pulihkan: `git show pre-refactor:scripts/freeze-syarat-ketentuan.ts`) — jalankan SEKALI sebelum template S&K diubah bila belum pernah dijalankan.
- **TASK-040** REVIEW — Mockup Laporan Owner (inferensial); menunggu keputusan user.
- **TASK-002** IN PROGRESS — sweep "Foundry" Purchasing/Payroll/Admin (belum pasti masih perlu).
- **TASK-004** BACKLOG — billing plan Owner Hojay (dokumen di luar repo).

Bug terbuka: tidak ada (`BUGS.md`).

## RECENT

- 2026-10-22: cleanup kode mati + refactor duplikasi (builder data cetak invoice, helper PDF, periode WIB untuk payroll, lazy-load Preview invoice). Titik kembali: tag `pre-refactor`.
- 2026-10-23: dokumen SDD diarsipkan; peta arsitektur di `CLAUDE.md`; komentar riwayat dipangkas.

## KNOWN RISKS

- Aksen kuning `#FFC800`: `bg-accent` solid wajib `text-ink`; `text-accent` di latar terang wajib `text-accent-700`. Bare `rounded` = 0px — pakai `rounded-md` dst. (lihat `KNOWN_ISSUES.md`).
- Tidak ada test otomatis; verifikasi = `npx tsc --noEmit`, `npm run build`, uji manual. Perubahan logika uang/PDF perlu uji manual di Preview Vercel.
