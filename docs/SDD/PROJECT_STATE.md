# HOJAY — Project State

> Single "catch up" file — read this first before starting any session or major task. See `TASKS.md`, `BUGS.md`, `KNOWN_ISSUES.md`, `CHANGELOG.md` for detail.

**Last updated:** 2026-09-19

---

## CURRENT TASK

None active — TASK-027 (Pelanggan filters), TASK-026's follow-ups 5-6 ("Tandai Sudah Kirim" modal + Beranda widget + badge-wrap bugfix), and TASK-028 (sortable column headers on Pelanggan + Inventory's % Komisi column) are all DONE, build/lint/typecheck clean, not yet click-tested live.

Known gap left open: "Tandai Sudah Kirim" is NOT yet on Beranda's Sales "Dikejar hari ini" card — that array's row shape doesn't carry `invoiceId`/`kurir` cleanly (mixes invoice + dormant-customer rows), needs a small restructure. Not yet asked for explicitly, but worth expecting.

TASK-002's Purchasing/Payroll/Admin sweep (see IN PROGRESS below) is still the last known open thread from the Foundry rework if the user wants to resume it.

## CURRENT STATUS

Katalog, Pelanggan, Inventory (Produk), Invoice (list/detail/forms/bayar/dp), Dashboard, Keuangan, Akuntansi, the shared shell, and the Insentif leaderboard's yellow-accent contrast are done and deployed (TASK-001/002, partial). Purchasing, Payroll, and Admin have not yet been swept for the same hard-border / bare-`rounded` / hidden-contrast issues — status unconfirmed as of this update, no evidence either way since 2026-08-30.

A large amount of feature/bugfix work has landed since the last full rewrite of this section (2026-09-03) — see `TASKS.md`/`BUGS.md`/`CHANGELOG.md` for the complete trail through TASK-022, this file only tracks the pointers below.

## LAST COMPLETED

- **TASK-028** — Sortable column headers added where missing: `/pelanggan`'s list (had none at all — new local `SortCol` component since that page isn't a real `<table>`) and the "% Komisi" column on `/produk` + `/produk/riwayat` (every other column there was already sortable). Not yet click-tested live.
- **TASK-026 follow-up 6** — Added "Tandai Sudah Kirim" to Beranda's desktop admin "Perlu Dikirim" widget (was deliberately left off, never actually confirmed). Fixed a real pre-existing bug: `FollowUpStatusBadge` wrapped onto two lines ("BELUM"/"BAYAR") in narrow columns — missing `whitespace-nowrap`. Not yet click-tested live.
- **TASK-026 follow-up 5** — "Tandai Sudah Kirim" rebuilt as a modal (Tanggal Dikirim + Kurir, both defaulted) — the deployed single-click confirm() version didn't match the approved mockup. Changing Kurir here replaces `Invoice.kurir`, flowing into the PDF/preview automatically. Not yet click-tested live.
- **TASK-027** — Pelanggan list gained search (nama/kode) + Kota filter; per-customer invoice history gained a status pill filter (Draft/Belum Bayar/Lunas). Fixed a latent bug where an empty search result wrongly showed the "add your first customer" empty state. Not yet click-tested live.
- **TASK-026** (+ 4 same-day follow-ups) — Invoice "Catatan" free-text field, shown on Invoice/Bukti Transfer AND Surat Jalan PDFs/previews. Beranda's "Perlu Ditindak" widget reframed as "Perlu Dikirim" — sorted first by payment tier (Lunas → Sudah DP → Belum Bayar/Draft), then by `tanggalKirim` shipping urgency within each tier, applied to all 4 admin/sales × desktop/mobile surfaces. Tanggal Pengiriman no longer defaults to H+3. "Stok tipis" row removed from the reframed desktop widget. "Lihat semua" leads to the full list (`/follow-up?view=kirim`) — `/follow-up`'s default view untouched (still needed by Komisi Saya's "Tagih yang tertahan"). **Real "Tandai Sudah Kirim" trigger added** (follow-up 4) — new `dikirim`/`tanggalDikirimAktual`/`dikirimOleh` fields on Invoice + `PATCH /api/invoices/[id]/kirim` + a shared `TandaiKirimButton` wired into the Invoice list, both `/follow-up` views, and the invoice detail page; once clicked, an invoice actually drops out of "Perlu Dikirim" everywhere (the 14-day paid-invoice lookback from follow-up 2 is kept as a second signal, not replaced — lets the historical backlog age out on its own without a risky bulk migration). Earlier parts screenshot-confirmed live by the user; the Tandai Sudah Kirim trigger itself has not yet been click-tested live.
- **TASK-025** — Pelanggan's Nama Toko/Usaha + Jenis Usaha are now optional (were required). Invoice's Provinsi/Kota unlocked (were disabled/auto-fill-only, never even saved) — now editable and persisted as real fields on Invoice. Katalog pencil-edit drawer no longer needs a manual page reload to show updated fields — fixed the actual root cause (KatalogClient's infinite-scroll list living in client state that router.refresh() never reached), not a workaround. Not yet click-tested live.
- **TASK-024** — Inventory "% Komisi" column on Semua Produk + Riwayat Stok (resolved rate + sub-label explaining why: flat barang baru / override produk / default kategori / default global), triggered by a real support question that needed a manual DB query to answer (silent per-product commission override, no UI visibility before this). `getEffectiveKomisiInfo()` in `lib/commission.ts`. Live values, not historical snapshots. Not yet click-tested live.
- **TASK-023** — Payroll "Riwayat" tab (Gaji `GajiPayment` history + Komisi payouts re-grouped from `Invoice.komisiCair` batches, with an invoice-level Detail drawer for Komisi rows — Komisi had no payment-history view of any kind before this). Invoice list's Sales filter (server-side URL param, hidden for `role:"sales"` sessions since they're already locked to their own invoices). Riwayat Stok's Tipe column gained a Baru/Bekas label read live off `Product.kondisi`. Previewed as an HTML mockup artifact first. Not yet click-tested with a real login in a browser — build/typecheck/lint clean only.
- **BUG-020** (+ same-day follow-up) — Invoice PDF/preview never showed "LUNAS" and kept displaying the old "Sisa Tagihan" balance forever after a DP invoice was fully paid (not a caching issue — both templates render live; the gap was no LUNAS logic existing at all, plus the totals block keying off the permanent `dpNominal` history field instead of current `status`). Added `isPaid` to `InvoicePrintData`; both templates now show a small "LUNAS" badge next to the invoice number and zero out "Sisa Tagihan" when paid. Follow-up same day: added a "Pelunasan (Tanggal)" row under the DP row, shown once paid, with the settlement amount/date (`app/invoice/[id]/page.tsx` needed `paymentTanggalBayar`/`paymentNominalDiterima` added to its `printData` — previously only the list page populated those).
- **TASK-022** (+ same-day retrofit) — Katalog photo watermark moved from a small (18% width, fully opaque) bottom-right badge to a centered, translucent one (55% width, 10% opacity, "Opsi C" of 4 real candidates the user picked from). Only affects new uploads by design — but the user then asked existing photos to get it too, so a one-off migration script retrofitted all 187 existing product photos (composited the new mark ON TOP of the already-watermarked photo, since no pre-watermark original was ever kept; user explicitly accepted the resulting double-watermark look). Script deleted after use, old Blob files kept as a rollback path.
- **BUG-019** — Right after TASK-021 deployed, the Invoice list's Preview drawer rendered docked LEFT instead of right — two hidden `InvoicePrintDoc` PDF-capture instances had been nested inside the drawer's own `flex justify-end` overlay, and even at `h-0` their un-clipped content width still counted toward the flex row's sizing. Moved them outside that flex container.
- **TASK-021** — Invoice list's Preview drawer gained a "Surat Jalan" tab (preview + its own "Unduh Surat Jalan (PDF)"), alongside the existing Invoice/Bukti Transfer tabs — no more detour to `/invoice/[id]` needed. Driver name is now captured once when the tab opens and shown live in the preview (with an "Ubah" link to correct it), instead of only being asked at download time; still never stored anywhere.
- **TASK-020** — Invoice list's 4 fixed-bucket stat cards collapsed into 2 dynamic ones ("Jumlah Invoice"/"Total Nilai Invoice") that track whichever status pill is active.
- **TASK-019** (+ **BUG-018**) — Product delete now Owner-only (Katalog + Inventory); Ukuran added to Inventory's list; Beranda's "Produk baru" notification now links to Katalog instead of the edit page.

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
