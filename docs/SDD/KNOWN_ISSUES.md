# HOJAY — Known Issues

> Limitations, tech debt, deferred bugs, and future improvements — so the same issue isn't rediscovered from scratch.

---

## Modules not yet swept for "Foundry" hard-edge / contrast issues

Katalog, Pelanggan, Inventory, Invoice, Dashboard, Keuangan, Akuntansi, and the shared shell/Dialog/Insentif have been brought up to the "Soft Trade" treatment (rounded corners, shadows instead of `border-2`, yellow-accent-safe contrast). **Not yet checked:** Purchasing, Payroll, Admin. See `TASKS.md` TASK-002 for the subtask breakdown. A quick way to find candidates in a new module:
```
grep -rln "border-2 border-ink" app/<module> components/<module>
grep -rnP '\brounded\b(?!-[a-z0-9])' app/<module> components/<module>
```
And manually check any `isTop`/`active`/`urgent`-style ternary that sets `text-white`/`bg-white` for a branch whose background might be `bg-accent` — grep alone won't reliably catch those (see BUG-003).

## Intentionally NOT "softened" — document-styled surfaces

These deliberately keep hard borders because they're meant to look like an actual printed/formal document, not app chrome — don't "fix" them in a future sweep:
- `app/invoice/[id]/page.tsx`'s `#invoice-doc` (the on-screen invoice preview, mirrors the PDF).
- `components/invoice/InvoicePrintDoc.tsx`, `components/cart/CatalogPrintDoc.tsx`, `components/akuntansi/ReportDocument.tsx` — the actual PDF/print targets.
- `InvoiceForm.tsx`'s totals-block `border-t-2 border-ink` above the grand total — a deliberate ledger-style emphasis rule, not card chrome.
- The three Akuntansi report pages' (`laba-rugi`, `neraca`, `neraca-saldo`) bold `border-t-2 border-ink` totals rows and the trial-balance table's cell borders — same ledger-style rule, live inside `ReportDocument.tsx`'s paper card.

## Yellow accent contrast rule (for any new UI going forward)

`--color-accent` is `#FFC800` (bright yellow) since TASK-001. Two rules to avoid re-introducing BUG-003-style issues:
1. Any solid `bg-accent` fill needs `text-ink` (dark), never `text-white`.
2. Any plain `text-accent` used as a text color on a light/white background is illegible — use `text-accent-700` (a dark amber, already the established "readable accent text" token) instead. `text-accent` (bright) is only safe on a dark background (e.g. the sidebar, `app/menu/page.tsx`'s full-screen dark menu).
3. When a component composes its className from a shared base class + a conditional variant (not literal `bg-accent ... text-white` on one line), a text-color grep sweep will miss it — check these by hand.

## Diskon has no formal ceiling for Barang Baru/Custom

See BUGS.md BUG-004 — deferred as part of TASK-003, not yet fixed.

## `react-hooks/set-state-in-effect` ESLint errors

Long-standing, repo-wide, pre-existing pattern (setState called synchronously inside a `useEffect` in several client components — `CartProvider.tsx`, `SearchableSelect.tsx`, `Form.tsx`'s `CurrencyInput`, `LoadingOverlay.tsx`, several admin/purchasing/payroll "load on mount" components, etc.). NOT enforced by the actual build/deploy gate (Next.js build only type-checks, doesn't fail on lint). Standard handling: when this appears on a line NOT touched by the current diff (verify via `git diff`), it's non-blocking — don't fix incidentally, it's out of scope unless the current task specifically targets it.
