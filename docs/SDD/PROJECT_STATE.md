# HOJAY — Project State

> Single "catch up" file — read this first before starting any session or major task. See `TASKS.md`, `BUGS.md`, `KNOWN_ISSUES.md`, `CHANGELOG.md` for detail.

**Last updated:** 2026-08-30

---

## CURRENT TASK

TASK-002 — "Foundry" UI rework: hunt down and fix remaining "kaku" (stiff/hard-edged) surfaces app-wide, module by module.

## CURRENT STATUS

IN PROGRESS — Katalog, Pelanggan, Inventory (Produk), Invoice (list/detail/forms/bayar/dp), the shared shell (sidebar/header/Panel/Button/Dialog/LoadingOverlay), and the Insentif leaderboard's yellow-accent contrast are done and deployed. Keuangan, Akuntansi, Purchasing, Payroll, Admin, and Dashboard have not yet been swept for the same hard-border / bare-`rounded` / hidden-contrast issues.

## LAST COMPLETED

- Fixed two "hidden" yellow-on-white contrast bugs that the first sweep's grep missed (`components/ui/Dialog.tsx`'s confirm button, `SalesBoard.tsx`/`MobileSalesBoard.tsx`'s rank-#1 highlight) — both built their className from a shared base + conditional bg, not a literal adjacent `bg-accent`/`text-white` pair.
- End-to-end Invoice + Inventory Foundry pass (see TASK-001, now DONE).

## IN PROGRESS

TASK-002 (see above) — next module to sweep: not yet decided, default to Dashboard (`app/page.tsx`) since it's the highest-traffic page not yet covered.

## BLOCKED

None.

## HIGH PRIORITY BUGS

None open. See `BUGS.md` for fixed history.

## NEXT TASK

Continue TASK-002 into Keuangan → Akuntansi → Purchasing → Payroll → Admin → Dashboard, in that order unless the user redirects. After TASK-002 settles, resume TASK-003 (Bulk Diskon — see `TASKS.md`, currently READY/paused by explicit user request).

## KNOWN RISKS

- The yellow accent (`#FFC800`) exploration is app-wide now (`app/globals.css`'s `--color-accent`). Any NEW component/page written from here on must remember: solid `bg-accent` fills need `text-ink` (not `text-white`), and plain `text-accent` on a light background needs `text-accent-700` instead (see `KNOWN_ISSUES.md` for the full pattern writeup).
- `components/ui/Button.tsx`'s base class used bare `rounded` (computes to 0px per `--radius-DEFAULT: 0`) for a long time before being caught — worth a periodic `grep -rnP '\brounded\b(?!-[a-z0-9])'` sweep on new code.
