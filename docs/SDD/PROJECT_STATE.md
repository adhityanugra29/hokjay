# HOJAY — Project State

> Single "catch up" file — read this first before starting any session or major task. See `TASKS.md`, `BUGS.md`, `KNOWN_ISSUES.md`, `CHANGELOG.md` for detail.

**Last updated:** 2026-08-30

---

## CURRENT TASK

TASK-002 — "Foundry" UI rework: hunt down and fix remaining "kaku" (stiff/hard-edged) surfaces app-wide, module by module.

## CURRENT STATUS

IN PROGRESS — Katalog, Pelanggan, Inventory (Produk), Invoice (list/detail/forms/bayar/dp), Dashboard, Keuangan, Akuntansi, the shared shell (sidebar/header/Panel/Button/Dialog/LoadingOverlay), and the Insentif leaderboard's yellow-accent contrast are done and deployed. Purchasing, Payroll, and Admin have not yet been swept for the same hard-border / bare-`rounded` / hidden-contrast issues.

## LAST COMPLETED

- SUBTASK-005: Akuntansi (`AkuntansiShell.tsx`, `ReportDocument.tsx`) — sidebar report picker softened (hard `border-r-2 border-ink` → `border-line`, stacked rows → one rounded card), stale hardcoded hex colors (`#f7f5ee`, pre-dating the Foundry token warm-up) replaced with the `bg-surface` token. The report documents themselves (`ReportDocument.tsx`'s paper card, the ledger-style `border-t-2 border-ink` totals rows in all 3 report pages) deliberately left alone — same "document-styled surface" exception as `#invoice-doc`/print docs, see `KNOWN_ISSUES.md`.
- SUBTASK-004: Keuangan (`app/keuangan/page.tsx`, `MobileKeuangan.tsx`, `TransactionForm.tsx`) — stat strip → cards, filter → pill toggle, `TransactionForm` moved to `FormCard`/`FormSection`.
- TASK-004 logged (billing plan for Owner Hojay) — scheduled for after TASK-002 + open bugs, not started.
- SUBTASK-003: Dashboard (`app/page.tsx`) — 3 action cards unified to rounded+shadow, bottom stats strip split into individual cards, hard dividers softened, several un-rounded badges/dots fixed.
- Fixed two "hidden" yellow-on-white contrast bugs that the first sweep's grep missed (`components/ui/Dialog.tsx`'s confirm button, `SalesBoard.tsx`/`MobileSalesBoard.tsx`'s rank-#1 highlight) — both built their className from a shared base + conditional bg, not a literal adjacent `bg-accent`/`text-white` pair.
- End-to-end Invoice + Inventory Foundry pass (see TASK-001, now DONE).

## IN PROGRESS

TASK-002 — next module to sweep: Purchasing (SUBTASK-006), then Payroll, Admin in that order unless redirected.

## BLOCKED

None.

## HIGH PRIORITY BUGS

None open. See `BUGS.md` for fixed history.

## NEXT TASK

Continue TASK-002 into Purchasing → Payroll → Admin, in that order unless the user redirects. After TASK-002 settles, resume TASK-003 (Bulk Diskon — see `TASKS.md`, currently READY/paused by explicit user request).

## KNOWN RISKS

- The yellow accent (`#FFC800`) exploration is app-wide now (`app/globals.css`'s `--color-accent`). Any NEW component/page written from here on must remember: solid `bg-accent` fills need `text-ink` (not `text-white`), and plain `text-accent` on a light background needs `text-accent-700` instead (see `KNOWN_ISSUES.md` for the full pattern writeup).
- `components/ui/Button.tsx`'s base class used bare `rounded` (computes to 0px per `--radius-DEFAULT: 0`) for a long time before being caught — worth a periodic `grep -rnP '\brounded\b(?!-[a-z0-9])'` sweep on new code.
- **Responsiveness (2026-08-30 user warning — "kamu suka lupa, saya peringatkan"):** every remaining subtask (Purchasing, Payroll, Admin) must explicitly verify mobile behavior before being marked DONE — existing `Mobile*.tsx` variants still correct, grids/stat-strips collapse at small widths, no new fixed-width overflow, new tables wrapped in `overflow-x-auto`. State this check explicitly in the closing report, not just assumed.
