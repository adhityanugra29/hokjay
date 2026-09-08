# HOJAY — Project State

> Single "catch up" file — read this first before starting any session or major task. See `TASKS.md`, `BUGS.md`, `KNOWN_ISSUES.md`, `CHANGELOG.md` for detail.

**Last updated:** 2026-09-08

---

## CURRENT TASK

None active — TASK-021 just closed. TASK-002's Purchasing/Payroll/Admin sweep (see IN PROGRESS below) is still the last known open thread from the Foundry rework if the user wants to resume it.

## CURRENT STATUS

Katalog, Pelanggan, Inventory (Produk), Invoice (list/detail/forms/bayar/dp), Dashboard, Keuangan, Akuntansi, the shared shell, and the Insentif leaderboard's yellow-accent contrast are done and deployed (TASK-001/002, partial). Purchasing, Payroll, and Admin have not yet been swept for the same hard-border / bare-`rounded` / hidden-contrast issues — status unconfirmed as of this update, no evidence either way since 2026-08-30.

A large amount of feature/bugfix work has landed since the last full rewrite of this section (2026-09-03) — see `TASKS.md`/`BUGS.md`/`CHANGELOG.md` for the complete trail through TASK-021/BUG-018, this file only tracks the pointers below.

## LAST COMPLETED

- **TASK-021** — Invoice list's Preview drawer gained a "Surat Jalan" tab (preview + its own "Unduh Surat Jalan (PDF)"), alongside the existing Invoice/Bukti Transfer tabs — no more detour to `/invoice/[id]` needed. Driver name is now captured once when the tab opens and shown live in the preview (with an "Ubah" link to correct it), instead of only being asked at download time; still never stored anywhere.
- **TASK-020** — Invoice list's 4 fixed-bucket stat cards collapsed into 2 dynamic ones ("Jumlah Invoice"/"Total Nilai Invoice") that track whichever status pill is active.
- **TASK-019** (+ **BUG-018**) — Product delete now Owner-only (Katalog + Inventory); Ukuran added to Inventory's list; Beranda's "Produk baru" notification now links to Katalog instead of the edit page.
- **TASK-018** — "Surat Jalan" (price-free delivery note PDF) on the invoice detail page, driver name typed fresh each download, never stored.
- **TASK-017** — Katalog Filter's Harga Rekomendasi/Harga Bottom toggle now resets every card's displayed price app-wide, not just the range-filter basis.

## IN PROGRESS

Nothing actively in flight. TASK-002's remaining modules (Purchasing SUBTASK-006, then Payroll, Admin) are the last known unfinished Foundry thread — pick back up if the user asks to continue the UI sweep.

## BLOCKED

None.

## HIGH PRIORITY BUGS

None open. See `BUGS.md` for fixed history.

## NEXT TASK

No task explicitly queued. If nothing else comes up: resume TASK-002 into Purchasing → Payroll → Admin (unconfirmed whether still needed — check for hard borders/bare `rounded` there first). TASK-004 (billing plan for Owner Hojay) was completed ad-hoc as a standalone document outside this repo (see git history around TASK-004 in `TASKS.md`), not tracked further here.

## KNOWN RISKS

- The yellow accent (`#FFC800`) exploration is app-wide now (`app/globals.css`'s `--color-accent`). Any NEW component/page written from here on must remember: solid `bg-accent` fills need `text-ink` (not `text-white`), and plain `text-accent` on a light background needs `text-accent-700` instead (see `KNOWN_ISSUES.md` for the full pattern writeup).
- `components/ui/Button.tsx`'s base class used bare `rounded` (computes to 0px per `--radius-DEFAULT: 0`) for a long time before being caught — worth a periodic `grep -rnP '\brounded\b(?!-[a-z0-9])'` sweep on new code.
- **Responsiveness (2026-08-30 user warning — "kamu suka lupa, saya peringatkan"):** every remaining subtask (Purchasing, Payroll, Admin) must explicitly verify mobile behavior before being marked DONE — existing `Mobile*.tsx` variants still correct, grids/stat-strips collapse at small widths, no new fixed-width overflow, new tables wrapped in `overflow-x-auto`. State this check explicitly in the closing report, not just assumed.
