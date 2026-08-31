# HOJAY — Change Log

> Newest first. See `TASKS.md`/`BUGS.md` for the full task/bug detail behind each entry.

---

## 2026-08-31

**BUG-005 fixed** — Katalog price field could get silently stuck at Rp 0 (shown both on-card and in the exported Katalog PDF), after an interrupted retype (select-all-on-focus, then blur before typing a replacement). `ProductCard.tsx`'s price `onBlur` now discards the override and falls back to the active preset instead of leaving 0 in place, with a warning explaining why. Confirmed via direct DB query this was never a data problem — no product has a zero base price.

Bugs fixed: BUG-005.
Regression: PASS.

---

## 2026-08-30

**TASK-002 SUBTASK-005** — Akuntansi Foundry sweep.

Changed: `AkuntansiShell.tsx`'s report-picker sidebar — hard `border-r-2 border-ink` divider softened to `border-line`, stacked hard-bordered link rows → one `rounded-xl` card; stale hardcoded `#f7f5ee` hex (pre-dating the Foundry cream-token warm-up) replaced with the `bg-surface` token in both `AkuntansiShell.tsx`'s row hover and `ReportDocument.tsx`'s interpretive note.
Preserved: `ReportDocument.tsx`'s paper-card styling and all 3 report pages' ledger-style `border-t-2 border-ink` totals rows left untouched — deliberate document-styled surfaces (now explicitly listed in `KNOWN_ISSUES.md`), same precedent as `#invoice-doc`. All report math/PDF export untouched.
Responsive: checked — layout already stacks (`grid-cols-1 lg:grid-cols-[252px_1fr]`), Neraca's 2-col grid and Neraca Saldo's table already collapse/scroll correctly at small widths; no layout/grid changes made, only border/color tokens.
Regression: PASS.

---

## 2026-08-30

**TASK-002 SUBTASK-004** — Keuangan Foundry sweep.

Changed: stat strip → 4 individual cards; Semua/Masuk/Keluar filter → pill toggle; hard section dividers softened; `TransactionForm.tsx` moved to `FormCard`/`FormSection`, its Pemasukan/Pengeluaran segmented control → pill toggle; `MobileKeuangan.tsx` dividers/CTA buttons softened.
Preserved: all cash-book math, category rekap, piutang/stok summary — untouched.
Regression: PASS.

Also logged TASK-004 (billing plan for Owner Hojay) — scheduled for after TASK-002 + open bugs, not started yet.

---

## 2026-08-30

**TASK-002 SUBTASK-003** — Dashboard (`app/page.tsx`) Foundry sweep.

Changed: 3 action cards unified to `rounded-2xl`+`shadow-sm` (were 3 different border weights); bottom stats strip → 4 individual cards; hard `border-b-2`/`border-t-2` dividers softened; several un-rounded small badges/buttons/dot fixed (including a literal square notification dot missing `rounded-full`).
Preserved: all data/queries/role-based branching (`isSales` view vs generic) untouched.
Regression: PASS.

---

## 2026-08-30

**TASK-002 (subtask)** — Fixed hidden yellow-on-white contrast bugs in Dialog and the Insentif leaderboard (BUG-003).

Changed:
- `components/ui/Dialog.tsx`: confirm button text color now follows danger/accent branch correctly; dialog box + buttons rounded.
- `components/insentif/SalesBoard.tsx`, `MobileSalesBoard.tsx`: rank-#1 highlight's internal text/progress-bar colors flipped from white to ink-based, now legible against the yellow fill.

Preserved: all dialog behavior (confirm/cancel/danger styling intent), leaderboard ranking/percent/target logic — unchanged.
Bugs fixed: BUG-003.
Regression: PASS (clean build, lint pre-existing-only).

---

## 2026-08-30

**TASK-002** — End-to-end Foundry pass across every remaining Invoice + Inventory page, so none were left on the old hard-bordered chrome (per explicit user request).

Changed:
- `app/invoice/page.tsx`: stat strip → individual rounded cards.
- `app/invoice/[id]/page.tsx`: Status Pembayaran / Riwayat sidebar boxes softened (the invoice-preview document itself deliberately left alone, see `KNOWN_ISSUES.md`).
- `components/invoice/PaymentForm.tsx`, `DpForm.tsx`: `Panel` → `FormCard`/`FormSection`, sidebar info boxes softened.
- `app/produk/(list)/kategori/page.tsx`, `riwayat/page.tsx`: row hover color moved from a hardcoded hex to the `bg-surface` token.

Preserved: every field/button/sort-column/filter/action on all 6 pages — Tandai Lunas Manual, Catat DP, bukti-transfer upload, kurir/no. resi, sort headers, search, Ubah/Hapus, etc. Nothing hidden, moved, or removed.
Regression: PASS.

---

## 2026-08-30

**TASK-002 (kicked off)** — Inventory list "extreme" rework + root-cause fix for the app-wide "still kaku" reports.

Changed:
- **BUG-002 fixed**: bare `rounded` (0px, see `KNOWN_ISSUES.md`) corrected to `rounded-lg`/`rounded-xl` in `Button.tsx` (used by nearly every button app-wide) and 8 more files.
- `components/ui/Panel.tsx`: `border-2` → `shadow-sm` + `rounded-2xl` (cascades to every page using `<Panel>` — Inventory, Keuangan, Purchasing, Payroll, etc. — for free).
- `components/invoice/ItemRowEditor.tsx`: item row → shadow card.
- `components/ui/LoadingOverlay.tsx`: hard border → rounded + shadow + backdrop-blur.
- `app/pelanggan/page.tsx`: full rework — stat strip → individual cards, filter → pill toggle, flat row list → one card with hover rows, sidebar sections → their own cards.
- `app/produk/(list)/page.tsx`: added a stat strip (Produk Aktif / Nilai Stok / Stok Lama), Kondisi badge → pill, row hover → token-based.

Bugs fixed: BUG-002.
Regression: PASS.

---

## 2026-08-30

**TASK-001 (execution)** — Invoice form redesign (was accidentally left as a 1-line change in the previous commit) + softened the 3 remaining hard-edged slide-over drawers.

Changed:
- `components/invoice/InvoiceForm.tsx`: full `FormCard`/`FormSection` rework (Pelanggan / Detail Invoice / Item Produk / Ringkasan sections) — all state/handlers/validation/draft-restore/API calls untouched.
- `components/katalog/KatalogFilterSidebar.tsx`, `EditProductDrawer.tsx`, `components/invoice/AddProductSidebar.tsx`: `border-l-2/border-b-2 border-ink` → `shadow-2xl`.

Regression: PASS.

---

## 2026-08-30

**TASK-001** — Full "Foundry" execution: design tokens, shell, and Pelanggan/Inventory forms.

Changed:
- `app/globals.css`: accent red `#ec3013` → yellow `#FFC800` (same yellow as the Katalog PDF export); base surface warmed to cream; `--color-danger` split into its own literal red (was aliased to `--color-accent-700`, an unrelated-concept coupling bug fixed along the way).
- ~40 files: `bg-accent + text-white` → `text-ink`; bare `text-accent` on light backgrounds → `text-accent-700` (sidebar/dark-menu contexts deliberately left alone).
- `components/layout/AppShell.tsx`: warm dark gradient sidebar, active nav → inset pill instead of full-bleed block.
- `components/layout/PageHeader.tsx`, `components/ui/StatCard.tsx`: softened.
- New `components/ui/FormSection.tsx` (`FormCard`/`FormSection`/`FormCardActions`) — purely additive.
- `components/pelanggan/CustomerForm.tsx`: sectioned (Identitas/Kontak/Alamat/Catatan).
- `components/produk/ProductForm.tsx`: compact layout, Foto Produk moved first + filename-based Nama Produk/Ukuran autofill (never overwrites manually-filled fields), Harga Minimum→Rekomendasi→Komisi% reordered, Harga Modal/Komisi Nominal shown as plain text instead of a fake disabled input.
- `components/katalog/ProductCard.tsx`, `KatalogClient.tsx`: "Soft Trade" card treatment, grid 4→3 columns (matching the approved mockup), Diskon field stacked instead of squeezed side-by-side.

Bugs fixed: BUG-001 (zoom collapse, fixed same day in a follow-up commit).
Regression: PASS — no business logic changed anywhere in this task (commission math, validation, privacy filters, stock/price rules all untouched, verified via diff review).
