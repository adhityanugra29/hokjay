# HOJAY — Project State

> Single "catch up" file — read this first before starting any session or major task. See `TASKS.md`, `BUGS.md`, `KNOWN_ISSUES.md`, `CHANGELOG.md` for detail.

**Last updated:** 2026-09-03

---

## CURRENT TASK

None active — TASK-003 (Bulk Diskon) just closed. TASK-002's Purchasing/Payroll/Admin sweep (see IN PROGRESS below) is still the last known open thread from the Foundry rework if the user wants to resume it.

## CURRENT STATUS

Katalog, Pelanggan, Inventory (Produk), Invoice (list/detail/forms/bayar/dp), Dashboard, Keuangan, Akuntansi, the shared shell, and the Insentif leaderboard's yellow-accent contrast are done and deployed (TASK-001/002, partial). Purchasing, Payroll, and Admin have not yet been swept for the same hard-border / bare-`rounded` / hidden-contrast issues — status unconfirmed as of this update, no evidence either way since 2026-08-30.

Since then: Merk now shows automatically in product names everywhere customer/sales-facing (TASK-005 + its "-" placeholder-data follow-up, BUG-010), Owner-only Komisi Bekas override per produk/kategori + Harga Minimum renamed to Harga Bottom (TASK-006 + a same-day follow-up locking Manager out of the Komisi field entirely), Katalog search now matches a full "80 x 60 x 100" query (BUG-009), and Diskon Bulk on Invoice (TASK-003, this update) — see `CHANGELOG.md` for the full trail.

## LAST COMPLETED

- **TASK-003** — Diskon Bulk on Invoice: one total-discount input + "Distribusikan" in Ringkasan, auto-split across line items (Baru/Custom first, clean Rp10.000 steps, manual entries/Flash Sale never touched). Also closed **BUG-004** (Baru/Custom diskon had no server-side ceiling) as part of the same work.
- **TASK-006** (+ same-day follow-up) — Owner-only Komisi Bekas override per produk/kategori; "Harga Minimum" renamed "Harga Bottom" app-wide (label only); Manager fully locked out of the pre-existing "Komisi — Persen" reference field too, per the user's explicit correction.
- **TASK-005** (+ follow-up, **BUG-010**) — Merk shows automatically in product names on Katalog/PDF/Invoice; a data quirk (135 of 225 products had `merk` literally stored as `"-"`) caused a visible stray dash, fixed by treating that placeholder as empty.
- **BUG-009** — Katalog search now matches a full "80 x 60 x 100" size query, not just a single number.
- SUBTASK-005: Akuntansi (`AkuntansiShell.tsx`, `ReportDocument.tsx`) — sidebar report picker softened, stale hardcoded hex replaced with `bg-surface`. Report documents themselves deliberately left alone (see `KNOWN_ISSUES.md`).
- SUBTASK-004/003: Keuangan and Dashboard Foundry passes — see `CHANGELOG.md` for detail.

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
