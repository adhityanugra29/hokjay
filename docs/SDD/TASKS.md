# HOJAY — Task Registry

> Source of truth for project tasks. Never silently delete a task — mark CANCELLED with a reason instead. Statuses: BACKLOG / READY / IN PROGRESS / BLOCKED / REVIEW / TESTING / DONE / CANCELLED.

---

## TASK-001 — "Foundry" design system: shell, accent color, core forms

**Type:** UX/UI
**Priority:** P2
**Status:** DONE
**Dependency:** None
**Created:** 2026-08-30 · **Last updated:** 2026-08-30

**Description:** Full visual direction confirmed via HTML mockup ("HOJAY Shell — Foundry") before touching real code: sidebar/logo/header, accent color red `#ec3013` → yellow `#FFC800` (same yellow already used in the Katalog PDF export), base surface warmed to cream, Pelanggan/Inventory/Invoice forms rebuilt into sectioned cards (`components/ui/FormSection.tsx`), Inventory's photo-first + filename-autofill feature, Katalog card "Soft Trade" treatment (shadow/rounded instead of hard borders).

**Acceptance criteria:** No existing capability removed (buttons/fields/filters/actions all still present, per the "MASTER AI DEVELOPMENT & DESIGN SYSTEM" capability-preservation rule); every `bg-accent` fill has legible text; clean build; deployed.

**Files affected:** `app/globals.css`, `components/layout/AppShell.tsx`, `components/layout/PageHeader.tsx`, `components/ui/{Button,Panel,Dialog,LoadingOverlay,FormSection,StatCard}.tsx`, `components/katalog/*`, `components/pelanggan/CustomerForm.tsx`, `components/produk/ProductForm.tsx`, `components/invoice/*`, and ~40 files touched only for the accent-contrast fix.

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

## TASK-003 — Bulk Diskon (Invoice)

**Type:** FEATURE
**Priority:** P2
**Status:** DONE (2026-09-03)
**Dependency:** None (independent of TASK-002, just sequenced after it by the user's choice)
**Created:** 2026-08-30 · **Last updated:** 2026-09-03

**Description:** One "Diskon Bulk" input + "Distribusikan" button in Invoice's Ringkasan section (right below Estimasi Komisi Sales, right above Total Diskon — both update live). Distributes one total discount amount across eligible line items to (1) keep every customer-visible per-unit discount a clean multiple of Rp10.000, (2) minimize sales commission erosion (Baru/Custom items cost 0.06/rupiah vs Bekas's ~1.0/rupiah — greedy-fills Baru/Custom first). Before coding, built an interactive HTML placement preview (2 mock line items, the real allocation math running client-side) and iterated the copy/placement with the user there first — see the artifact-preview step in this session.

**Algorithm** (`allocateBulkDiskon()` in `lib/commission.ts`): filters to eligible lines (not Flash Sale, `diskonPerUnit === 0` — never overwrites a manual entry) → sorts cheapest-commission-cost first → fills each line up to `min(remaining, cap)` rounded down to the nearest Rp10.000, where cap is `maxDiskonBaru(hargaJual)` (new) for Baru/Custom or `maxDiskonBekas(...)` for Bekas → mops up any rounding remainder (or genuine capacity shortfall) in further Rp10.000 steps, cheapest-line-first, until the request is met or every eligible line is maxed. Returns `{ allocations, achieved, capped }` so the UI can show exactly what was distributed and whether it fell short.

**Acceptance criteria:** `computeLineCommission`/`maxDiskonBekas` untouched (new pure functions only — `maxDiskonBaru`, `allocateBulkDiskon`); server-side clamp added for Baru/Custom diskon in both `createInvoice.ts`/`updateInvoice.ts` (closes BUG-004); manual per-line diskon entries are never overwritten by the bulk allocator (verified via a manual sanity script covering 7 cases: plain split, over-capacity clamp, sub-Rp10k request, exact-cap request, qty>1 rounding, manual-diskon skip, Flash-Sale skip — all correct).

**Files affected:** `lib/commission.ts`, `components/invoice/InvoiceForm.tsx`, `lib/services/createInvoice.ts`, `lib/services/updateInvoice.ts`.
**Regression test:** Clean build; lint diff shows only the pre-existing `react-hooks/set-state-in-effect` in `InvoiceForm.tsx` (2 instances, both pre-existing effects untouched by this change).

**Follow-up (2026-09-03, same day):** the user reported "ini bug" on the Diskon Bulk input. Re-checked the allocator/`updateItem` wiring end to end (including the custom-item `productId` edge case) — no computational defect found. The real issue: the input used a plain `Input` (raw digits while typing, e.g. "150000") instead of `CurrencyInput`, the accounting-style thousand-separator component every other Rupiah field in this app already uses (Harga Jual, Diskon /unit, right next to it). Switched to `CurrencyInput` — matches the user's explicit ask ("format tulisanya harus accounting juga").

**Follow-up #2 (2026-09-03, same day):** the user then reported the allocator "meletakan hanya di satu kolom" with "tanpa ada plafonya" — not actually a distribution bug (greedy cheapest-first, confirmed 2026-08-30, correctly shifts to the next line once one is maxed — see BUG-004's correction), but the CAP itself was wrong: Baru/Custom's `maxDiskonBaru` capped at 100% of `hargaJual` (no real ceiling) instead of the same protected-margin shape `maxDiskonBekas` already used. Fixed at the source (`maxDiskonBaru`, see BUG-004) — the allocator and `InvoiceForm.tsx` needed no changes themselves, since both already consult `maxDiskonBaru` for the cap rather than hardcoding one.

**Follow-up #3 (2026-09-03, same day):** the user then noticed re-running "Distribusikan" (a typo, or wanting a different total) found nothing to redistribute into, since `allocateBulkDiskon` only ever fills a line sitting at Rp0 — after one run, every touched line looks like a manual entry, indistinguishable from one the sales rep actually typed by hand. `InvoiceForm.tsx` now tracks `lastBulkDiskon: Map<productId, diskonPerUnit>` (the exact values THIS feature itself last set) — a re-run first resets any line still holding exactly that value back to Rp0 before allocating again, so it overwrites its own previous split; a line the rep has since typed something else into (or a genuinely manual one that was never touched by bulk) is never in the map and stays fully protected either way.

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

## TASK-005 — Merk otomatis muncul di nama produk (Katalog/PDF/Invoice)

**Type:** FEATURE
**Priority:** P2
**Status:** DONE (2026-09-02)
**Dependency:** None
**Created:** 2026-09-02 · **Last updated:** 2026-09-02

**Description:** The `merk` field already existed on `Product` and its form, but only ever showed on the admin Inventory list (as a separate "· Merk" suffix). Katalog cards, the Katalog PDF, and the Invoice product picker all showed just `product.name`, so a brand only appeared if typed straight into Nama Produk. Per the user's request 2026-09-02 ("kulkas hosizaki... user tidak perlu input merk di judul, cukup mereka input merk di form"), added `productDisplayName(name, merk)` to `lib/format.ts` (`"Kulkas Hosizaki"` when merk is set, else just the name) and applied it at the 3 customer/sales-facing surfaces: Katalog card title + its invoice-snapshot `addItem` call (`ProductCard.tsx`), the Katalog PDF's two product-name render sites (`CatalogPrintDoc.tsx`), and the Invoice "Tambah Produk" sidebar's list + its own `addItem` call (`AddProductSidebar.tsx`).

**Acceptance criteria:** Stored `Product.name` untouched (no DB write changes) — this only changes what's displayed/snapshotted at render/add-to-cart time. Admin Inventory list (`app/produk/(list)/page.tsx`) and the product edit form left as-is (already correct / needs the raw name for editing).

**Files affected:** `lib/format.ts`, `components/katalog/ProductCard.tsx`, `components/cart/CatalogPrintDoc.tsx`, `components/invoice/AddProductSidebar.tsx`.
**Regression test:** Clean build; lint diff shows only the pre-existing `react-hooks/set-state-in-effect` in `AddProductSidebar.tsx`.

**Follow-up (2026-09-02, same day):** the user asked to confirm no stray "-" ever shows when merk is empty (`productDisplayName` already returns just `name` in that case — confirmed, no change needed) and to audit naming consistency across every surface. Found two gaps missed in the first pass — `app/katalog/custom/page.tsx` (Produk Custom listing) didn't pass `merk` into `ProductCard` at all, and `app/katalog/custom-order/page.tsx` (the "Pesan Produk Custom" flow) added its freshly-created product straight to cart with `product.name`, bypassing `productDisplayName`. Both now consistent with the other 3 surfaces. `EditProductDrawer.tsx`'s header intentionally left showing the raw name (matches the raw-name field below it in the edit form — showing the combined display name there would be confusing while editing).

---

## TASK-006 — Owner-only Komisi Bekas override (per produk & per kategori) + rename Harga Minimum → Harga Bottom

**Type:** FEATURE
**Priority:** P2
**Status:** DONE (2026-09-03)
**Dependency:** None
**Created:** 2026-09-03 · **Last updated:** 2026-09-03

**Description:** The real invoice-time barang-bekas commission rate was a hardcoded flat 10% of Harga Minimum everywhere (`lib/commission.ts`) — the existing `Product.komisiPercent` field looked like it should drive this but is actually unrelated (its own hint already said "Nilai referensi — komisi invoice dihitung otomatis"; it only feeds the Hot Products dashboard figure, `komisiPercent% × hargaRekomendasi`). Per the user's request 2026-09-03, Owner (+ Super Admin) can now override the bekas rate per product and set a default per category, while Baru/Custom (flat 6%) and Flash Sale (flat 7%) stay untouched — confirmed with the user this scope is deliberately bekas-only.

**Hierarchy:** product's own override → its category's default → global 10% — `resolveKomisiBekasPercent()` in `lib/commission.ts`. Confirmed with the user: a category-level change applies to every product in it EXCEPT ones that already have their own override, which always wins.

**Data model:** `Product.komisiBekasPercent?: number` (new, separate from the pre-existing `komisiPercent` — reusing that field would have silently dropped every existing bekas product's real commission from 10% to its 5% default). `Category.komisiBekasPercent?: number` (new).

**Server-side authority:** `createInvoice.ts`/`updateInvoice.ts` resolve the effective rate themselves from the DB (product + a `getKategoriKomisiBekasMap()` category lookup, `lib/katalog.ts`) — never trust a client-submitted rate, same posture as `hargaMinimum`'s own floor enforcement right next to it. `computeLineCommission()`/`maxDiskonBekas()` both gained an optional `komisiBekasPercent` param (defaults to 10, the original behavior, when omitted) so every pre-existing call site with no override set behaves byte-identical to before.

**Client-side preview (cosmetic — the server always recomputes authoritatively on save):** the resolved rate is threaded through the same 4 live-preview call sites as `hargaMinimum` already reaches — `ProductCard.tsx`, `AddProductSidebar.tsx`, `InvoiceForm.tsx`, `ItemRowEditor.tsx` — plus `CartProvider.tsx`'s `CartItem` type and `app/invoice/[id]/ubah/page.tsx`'s existing-invoice-to-cart conversion.

**Owner-only UI:** per-product override lives in the existing `ProductForm.tsx` (Harga & Komisi section), visible only when Kondisi=Bekas and `isOwner` — saved through a dedicated `PATCH /api/products/[id]/komisi-bekas` (own server-side role check, same isolation as `flash-sale/route.ts`; the general product PATCH route deliberately never accepts this field, so a Manager saving unrelated changes can't touch or wipe it). Per-category default lives in `CategoryManager.tsx` (`/admin`, tab Kategori) — that page itself stays reachable by every admin-level role, so just the Komisi Bekas column/field within it is conditionally rendered and the existing `/api/categories/[id]` PATCH gained its own inline role check for that one field only.

**Rename:** "Harga Minimum" → "Harga Bottom" — display label only, `hargaMinimum` left as the DB/code field name (no migration). 4 files: `ProductForm.tsx`, `ItemRowEditor.tsx`, `KatalogFilterSidebar.tsx`, `ProductCard.tsx`.

**Bug found & fixed along the way:** `app/katalog/page.tsx` had `merk` stuck inside the `canEditProduct`-only field block (a leftover from before TASK-005 wired Merk into the card title) — a Sales rep's own Katalog view never actually received Merk data at all, only Manager/Owner/Super Admin did. Moved it to the always-sent section.

**Acceptance criteria:** Every existing bekas product with no override set (the overwhelming majority) computes an identical commission to before — verified by `DEFAULT_KOMISI_BEKAS_PERCENT = 10` being the fallback at every layer. Manager (admin-level, but not Owner) can't see or edit either override anywhere, verified by role checks at both the UI-gate and the API-write layers (2 new/extended server routes).

**Files affected:** `models/Product.ts`, `models/Category.ts`, `lib/commission.ts`, `lib/katalog.ts`, `lib/services/createInvoice.ts`, `lib/services/updateInvoice.ts`, `components/katalog/{ProductCard,KatalogClient,EditProductDrawer,KatalogFilterSidebar}.tsx`, `components/invoice/{AddProductSidebar,InvoiceForm,ItemRowEditor}.tsx`, `components/cart/CartProvider.tsx`, `components/produk/ProductForm.tsx`, `components/admin/CategoryManager.tsx`, `app/katalog/page.tsx`, `app/produk/baru/page.tsx`, `app/produk/[id]/edit/page.tsx`, `app/invoice/[id]/ubah/page.tsx`, `app/admin/page.tsx`, `app/api/products/route.ts`, `app/api/products/[id]/komisi-bekas/route.ts` (new), `app/api/categories/[id]/route.ts`.
**Regression test:** Clean build; lint diff shows only the pre-existing `react-hooks/set-state-in-effect` errors, none new.

**Follow-up (2026-09-03, same day):** the pre-existing "Komisi — Persen" reference field (`komisiPercent`) was still editable by Manager (anyone with `canEditProduct`) in `ProductForm.tsx`, and its Komisi Nominal readout was visible to them too — inconsistent with the owner-only posture just built for `komisiBekasPercent`. Per the user's direct follow-up ("manager tidak boleh untuk edit komisi, kolom insentif tidak boleh terlihat pada input barang... hanya owner yang boleh"): both the field and its readout are now hidden entirely (not just disabled) unless `isOwner`. Removed `komisiPercent` from the general PATCH route's allowlist (`app/api/products/[id]/route.ts`) and moved it into the same dedicated Owner-only endpoint as `komisiBekasPercent` (`komisi-bekas/route.ts`, now handles both fields under one server-side role check) — a Manager can no longer move this value through a raw API request either, not just the hidden UI. `POST /api/products` (create) deliberately left accepting it unchanged: a non-owner's create payload only ever carries the sensible auto-default `setKondisi()` already computes (6%/10%), never something they consciously typed, so there was nothing to lock down there. Katalog's own live commission figure was already view-only (a computed `<span>`, never an input) — confirmed, no change needed.

---

## TASK-007 — Akun Login restricted to Owner/Super Admin (Manager locked out)

**Type:** ACCESS CONTROL
**Priority:** P2
**Status:** DONE (2026-09-04)
**Dependency:** None
**Created:** 2026-09-04 · **Last updated:** 2026-09-04

**Description:** While investigating a name-mismatch bug on "Komisi Saya" (a Manager's login `nama` — "Avicenna Pangaran" — didn't match their Sales roster entry — "Avi" — so `getMyCommissionSummary()` found none of their own invoices; a data fix, not a code one, left for the user to apply), the user separately confirmed a policy reversal: "manager hojay, tidak boleh untuk masuk ke kelola user [akun login], karena itu khusus untuk superadmin dan owner". This reverses a 2026-08-27 decision that had explicitly reopened Akun Login for Manager alongside Kategori/Kurir/Metode Pembayaran.

**Why it mattered beyond the UI tab:** `/api/admin/users` (GET/POST) and `/api/admin/users/[id]` (PATCH/DELETE) had no role check of their own — only the `/api/admin` prefix's blanket `isAdminLevel` middleware check, which Manager already satisfies. Hiding the tab alone would have left a raw API request able to create accounts, delete them, or — the real risk — PATCH any account's `role` (including their own, to `owner`) or reset a password, same class of gap as BUG-004/Komisi Bekas before their own dedicated routes existed.

**Fix:** `/admin/akun` added to `MANAGER_BLOCKED_ADMIN_PREFIXES` (`lib/auth/access.ts`) — hides the tab and blocks direct navigation, same mechanism as the pre-existing Sales/Keuangan blocks. New `AKUN_LOGIN_ROLES`/`isAkunLoginAllowed()` (Owner/Super Admin only) enforced at the top of all 4 handlers across both API routes — same isolation pattern as `flash-sale/route.ts` and `komisi-bekas/route.ts`, deliberately narrower than the general `/api/admin` middleware grant.

**Files affected:** `lib/auth/access.ts`, `app/api/admin/users/route.ts`, `app/api/admin/users/[id]/route.ts`.
**Regression test:** Clean build; lint diff shows one pre-existing unused-var warning (`_omit` in `users/route.ts`, untouched by this change — confirmed via `git diff`), no new errors.

---

## TASK-008 — Komisi detail pop-up on Bayar Komisi's Daftar Bayar list

**Type:** FEATURE
**Priority:** P2
**Status:** DONE (2026-09-04)
**Dependency:** None
**Created:** 2026-09-04 · **Last updated:** 2026-09-04

**Description:** Per the user's screenshot + request ("detailnya angka komisi ini, detailnya mana? kamu bikin pop-up detail aja dan berikan buttonya, supaya si owner mudah untuk bayarin komisinya, ada basis data yang bisa dipercaya atas komisi yang kamu hitung"): each row's aggregate commission total on the Daftar Bayar list (Payroll → Komisi tab) had no way to see what it was made of — an Owner had to trust the number outright. A per-sales invoice-level breakdown already existed at `/payroll/komisi/[nama]` (`KomisiPaymentForm.tsx` — table of nomor/tanggal lunas/item/komisi per invoice, plus its own pay flow), but nothing on the Daftar Bayar list linked to it.

**Fix:** Added a "Detail (N invoice)" button per row in `BayarKomisiSheet.tsx` that opens a pop-up (same right-side drawer pattern as `EditProductDrawer.tsx`, just wider for the table) rather than navigating away — navigating to the standalone page would have lost the Daftar Bayar list's own batch-checkbox selection. The pop-up reuses `KomisiPaymentForm` as-is (now takes optional `onSuccess`/`onCancel` so the pop-up usage closes + refreshes in place instead of `router.push`-ing to `/payroll`) — same table, same pay button, same `/api/insentif/bayar` endpoint the standalone page already used, so the number shown and the number actually paid can never drift apart. No new query: `app/payroll/page.tsx` was already fetching each sales's full `getUnpaidCommissionInvoices()` result to build `invoiceIds` — it just kept the rest of that data (`detail`) instead of discarding it.

**Confirmed already correct while investigating (2026-09-04, same day):** the user separately asked "pembayaran komisi itu, hanya invoice yang sudah lunas ya" — checked all 3 layers (`getUnpaidCommissionBySales`, `getUnpaidCommissionInvoices`, and `/api/insentif/bayar`'s `findOneAndUpdate` re-check) and confirmed every one already filters `status: "paid"` — no change needed.

**Files affected:** `components/insentif/BayarKomisiSheet.tsx`, `components/insentif/KomisiPaymentForm.tsx`, `app/payroll/page.tsx`.
**Regression test:** Clean build, lint clean (also removed one pre-existing unused `useMemo` import found while in this file).

**Follow-up (2026-09-04, same day):** per the user's report, 3 fixes: (1) the Detail button moved out of the Sales cell into its own column next to Status, and Status's column widened (150→220px, Detail narrowed 110→90px) + `whitespace-nowrap` added, since "Rekening belum diverifikasi" was wrapping to two lines and throwing the row's alignment off; (2) the drawer's eyebrow now reads exactly "Detail Invoice" (invoice count moved next to the sales name instead); (3) each invoice number in the pop-up's table is now a link straight to `/invoice/[id]`.

**Follow-up #2 (2026-09-04, same day):** the "Detail Invoice" name was meant for the table's own column header too, not just the pop-up's title — that column had been left blank (an empty `<span />`, matching the checkbox column's convention). Added the label and widened the column (90→130px) to fit it.

---

## TASK-009 — Invoice list: single filtered list + Preview drawer

**Type:** FEATURE
**Priority:** P2
**Status:** DONE (2026-09-04)
**Dependency:** None
**Created:** 2026-09-04 · **Last updated:** 2026-09-04

**Description:** Per the user's request, `/invoice` gets (1) a status separator between Sudah Lunas / Sudah DP / Belum Dibayar and (2) a way to preview an invoice's actual document without leaving the list. Went through a design-review cycle via an interactive HTML mockup before coding (per this session's established practice): a first version stacked 3 separate sections (mirroring the old Draft/Belum Dibayar/Sudah Lunas layout) was explicitly rejected — "kamu jangan pisah itu berdasarkan line, seharusnya kamu grouping dan ada semacam button tambahan untuk melihat statusnya, seperti slide button... tapi untuk kumpulan invoice, gaperlu kamu pisahkan by line". Rebuilt as **one flat list** filtered through a pill/segmented toggle (Semua/Belum Dibayar/Sudah DP/Draft/Sudah Lunas) plus click-to-filter stat cards — same pattern as Keuangan's existing Semua/Masuk/Keluar filter, not a new one.

**Also corrected mid-review:** the day block (left of each row) used to show different content per status (days-elapsed for unpaid, "DP 40%", a draft placeholder, or the real date for paid) — the user asked for it to always be the invoice's own date instead ("saya mau ini jadi tanggal dibuat saja"), with the "N hari belum bayar" urgency signal kept but moved to its own separate warning badge next to the status tag ("tapi untuk warning belum bayar juga masih ada tapi terpisah").

**Preview:** extracted the on-screen invoice document (previously inline JSX in `app/invoice/[id]/page.tsx`, `id="invoice-doc"`) into a standalone `InvoiceDocument.tsx`, reused by both the detail page (unchanged behavior) and a new right-side drawer on the list (`InvoiceListClient.tsx`) — one component, so the two views can never visually drift apart. `displayDiskon`/`displayHarga` (Flash Sale price-display helpers) exported from `InvoicePrintDoc.tsx` instead of being duplicated a third time. No extra DB query for the preview data: `app/invoice/page.tsx` already fetched full `Invoice` documents (not `.lean()`) for the list, so every field `InvoicePrintData` needs was already in memory — added one batched `Sales.find({nama:{$in:...}})` (same pattern as `app/payroll/page.tsx`) purely for each invoice's live sales phone number.

**Acceptance criteria:** Every existing row action (Kirim WA, Edit, Hapus, Tandai lunas, Lanjutkan) preserved exactly, including the "no Hapus once DP'd" rule. `/invoice/[id]`'s own on-screen document is byte-identical to before (pure extraction, not a redesign).

**Files affected:** `app/invoice/page.tsx` (rewritten), `app/invoice/[id]/page.tsx` (JSX extracted, otherwise unchanged), `components/invoice/InvoiceDocument.tsx` (new), `components/invoice/InvoiceListClient.tsx` (new), `components/invoice/InvoicePrintDoc.tsx` (2 helpers exported).
**Regression test:** Clean build; lint clean on every touched file (zero errors, not even the usual pre-existing set).

**Follow-up (2026-09-04, same day):** added a Bulan/Tahun periode filter per the user's request ("tambahkan di html itu periode, supaya user bisa untuk filter bulanya") — new `InvoicePeriodFilter.tsx`, both dropdowns defaulting to "Semua" (unlike the shared `PeriodPicker.tsx` elsewhere, which always pins one month; Invoice's default view is everything). Filters server-side (`Invoice.find`'s own `tanggalInvoice` range, not a client-side narrowing of an already-fetched set) since invoice history can grow large over time. The "Lunas {month}" stat card deliberately stays anchored to the real current month regardless of the periode picked — computed via a separate `countDocuments` against the pre-periode filter, not derived from the (possibly differently-scoped) fetched list. Hidden `bulan`/`tahun` inputs added to the search form so submitting search doesn't drop the periode (a plain `<form>` GET only sends its own fields, dropping every other URL param otherwise).

**Follow-up #2 (2026-09-04, same day):** the periode selects rendered visibly taller than the search box next to them (`items-center` alone doesn't fix a real height mismatch) — the shared `Select`'s base padding/font-size is sized for full-width form fields, not a compact filter row. Overrode with `!py-2 !text-[0.78rem]` (matching `SearchInput`'s own sizing exactly) so both rows sit level — confirmed via a screenshot before shipping.

**Also investigated the same day:** the user separately reported "tidak bisa untuk generate invoice" (no error message given). Reproduced the create flow at every layer — `createInvoice()` called directly, `POST /api/invoices` over real HTTP, and the full `/invoice/baru` form driven through a headless browser (opening the product sidebar, adding an item) — all succeeded with zero errors and a real invoice persisted each time. No fix applied; asked the user for the specific error/screenshot instead of guessing, per this project's own established rule against fixing without reproduction (see BUG-007's history). (The real crash behind that report turned out to be unrelated to invoice *creation* — see BUG-012.)

**Follow-up #3 (2026-09-04, same day):** the user rejected the periode filter's actual layout at a wider viewport ("masa peletakanya seperti ini? ... sangat disfunction") and asked for an HTML plan before any further code changes ("coba kamu buat dulu planya di html"). Published a Before/After mockup, got sign-off ("untuk periode di invoice, tolong proceed dari html ya"), then implemented exactly what it showed:
- `InvoicePeriodFilter.tsx` now returns a Fragment instead of its own wrapping `flex flex-wrap` div — that div, nested inside `app/invoice/page.tsx`'s own already-`flex-wrap` filter row, was giving the browser a starved inner width to wrap the two `<select>`s against even though the outer row had plenty of room (confirmed via live `getBoundingClientRect()` measurement before the fix — both selects stacked at 1117px wide, far past the search box).
- Fixing that exposed a second bug in the same spot: the shared `Select`'s base class carries `w-full`, and a same-specificity `w-auto` override doesn't reliably win depending on Tailwind's generated stylesheet order — both selects were still rendering full-width even as Fragment siblings. Changed the override to `!w-auto`.
- Bulan/Tahun now only list months/years that actually have at least one invoice — per the user's explicit ask ("jika tidak ada datanya, gaperlu dimunculin: contoh tidak ada bulan januari di datanya... tidak perlu untuk dishow"). New aggregation in `app/invoice/page.tsx` (`$group` with `$addToSet` on `$month`/`$year` of `tanggalInvoice`, Asia/Jakarta timezone), scoped to the same `invoiceVisibilityFilter` as the list itself (not the search text, so typing in the search box doesn't shift the dropdown's own options) — replaces the old hardcoded `currentYear-3..+1` window entirely.

**Files affected (follow-up #3):** `components/invoice/InvoicePeriodFilter.tsx`, `app/invoice/page.tsx`.
**Regression test:** Clean build, lint clean. Verified live via Playwright `getBoundingClientRect()` at a 1470px viewport (both selects now sit in the same row as the search box, ~125px wide each, not 1117px) and read the rendered `<option>` lists directly (only "Agustus"/"September"/"2026" — the real available periods in this data).

---

## TASK-011 — Invoice "Kirim ke Pelanggan (WA)": attach the PDF where the OS allows it

**Type:** FEATURE
**Priority:** P3
**Status:** DONE (2026-09-04)
**Dependency:** None
**Created:** 2026-09-04 · **Last updated:** 2026-09-04

**Description:** User asked "kenapa pengiriman PDF tidak bisa langsung ke nomor whatsapp yang dituju?". Explained the real constraint: `wa.me` links can only pre-fill text, WhatsApp exposes no public URL parameter to pre-attach a file — this is why the invoice detail page (`/invoice/[id]`) always needed two separate manual steps (download PDF, then re-attach it by hand inside WhatsApp). Offered 3 options; the user picked the Web Share API route.

**Fix:** `InvoiceActions.tsx`'s "Kirim ke Pelanggan (WA)" button now feature-detects `navigator.share`/`navigator.canShare` support for files (`typeof` checked, not just `in`, so a webview that stubs the keys without real functions behind them falls back safely instead of throwing). Where supported (mobile Chrome/Safari, confirmed to also report `true` in this session's headless Chromium test rig), it builds the same PDF `downloadInvoicePdf()` already did (that PDF-generation core was extracted into a shared `buildInvoicePdf()`) and hands it to the native OS share sheet via `navigator.share({ files, text })` — WhatsApp becomes one tap away with the file already attached, no detour through the Downloads folder. Where unsupported (desktop browsers), falls back to the original text-only `wa.me` link unchanged. The target phone number still can't be picked programmatically once the OS share sheet or WhatsApp itself takes over — that's an OS/WhatsApp-side limitation with no public workaround (a real "auto-send to number X" would require the paid, Meta-approved WhatsApp Business Platform API, out of scope here and not requested).

**Files affected:** `components/invoice/InvoiceActions.tsx`.
**Regression test:** Clean build, lint clean. Verified both branches live (Playwright, real invoice, real PDF bytes): the share path calls `navigator.share` with the correct message text and a real ~220KB `<nomor>.pdf` File; the fallback path (canShare/share stubbed absent) still opens the identical `wa.me?text=...` link as before. Also caught and fixed a real crash during this testing — an unrealistic-but-defensive-worth-fixing case where `canShare`/`share` exist as non-function properties threw "navigator.canShare is not a function"; switched the guard from `"x" in navigator` to `typeof navigator.x === "function"`.


---

## TASK-010 — Exclude Owner accounts from Payroll commission listing

**Type:** BUGFIX/SCOPE
**Priority:** P2
**Status:** DONE (2026-09-04)
**Dependency:** None
**Created:** 2026-09-04 · **Last updated:** 2026-09-04

**Description:** Per the user's request ("andi abdillah di payroll, tidak perlu ada komisinya (karena dia owner)"): Andi abdillah's login `nama` exactly matches a real `Sales` roster entry (the app links commission to that plain name string, not a real foreign key — see TASK-007), so every paid invoice attributed to him as the "sales" on it produced a real commission total on Payroll's Daftar Bayar list (Rp 15.103.000, confirmed via screenshot) — technically correct math, but the Owner isn't a commission-earning rep and shouldn't appear there.

**Fix:** `getUnpaidCommissionBySales()` and `getUnpaidCommissionInvoices()` (`lib/insentif.ts`) now exclude any `sales.nama` matching a `User` with `role: "owner"` (new `getOwnerNames()` helper, queried fresh each call — no caching, matching this file's existing pattern). Scoped to role rather than hardcoding "Andi abdillah" so it keeps holding if the Owner account is renamed or a second Owner is added. Both functions are Payroll-only (confirmed via grep — no other page calls either), so the exclusion doesn't touch the Insentif leaderboard, Komisi Saya, or any other ranking/commission view, matching the user's literal "di payroll" scope.

**Files affected:** `lib/insentif.ts`.
**Regression test:** Clean build, lint clean. Verified live against real data (`next start` + curl as Owner): "Andi abdillah" no longer appears in the Daftar Bayar list (only as the logged-in user's own sidebar name, unrelated), remaining sales' totals (Rp 11.325.000 / 6.221.000 / 1.495.000 / 620.000 / grand total Rp 19.661.000) unchanged from before the fix.


---

## TASK-012 — Katalog: server-paginated infinite scroll (12 produk/batch) + Terbaru→Kategori→Harga default sort

**Type:** PERFORMANCE
**Priority:** P2
**Status:** DONE (2026-09-05)
**Dependency:** None
**Created:** 2026-09-04 · **Last updated:** 2026-09-05

**Description:** Per the user's request ("untuk penarikan data yang ingin ditampilkan pagination dengan otomatis menarik data baru setelah scroll sudah sampai bawah, kamu limit saja 12 produk, supaya ini lebih cepat lagi untuk ngeload katalognya"). `app/katalog/page.tsx` previously fetched **every** matching product (200+, growing) in one shot and shipped the full array to the client, which then did all searching/filtering/sorting in a client-side `useMemo` over the in-memory array — a prior fix (2026-08-31) already capped how many `<ProductCard>`s/images mounted at once, but never reduced the actual data pull, which is what was still slow.

**Also folded in the same day:** the user separately specified the default sort order explicitly — "Urutan produk di katalog: 1. Produk terbaru, 2. Kategori, 3. Harga". Confirmed via AskUserQuestion: "Produk terbaru" reuses the existing "Produk Baru" concept (`getProdukBaruIds()` — same rule as the Filter sidebar's "Hanya Produk Baru" checkbox) as a leading block, not a raw `createdAt` sort; Harga's default direction within a category is termahal dulu (descending); picking "Urutkan: Harga Terendah/Tertinggi" from the existing dropdown is a full override (Produk Baru/Kategori grouping drops out entirely, Flash Sale/booked-DP-sold tier still applies).

**Fix:** Moved all filtering/sorting/grouping into a shared `queryKatalogProducts()`/`queryKatalogAvailableIds()` (`lib/katalog.ts`) built as a MongoDB aggregation — `$match` (every `KatalogFilters` field, incl. `parseSizeQuery`/`sizeMatchClauses` ported server-side from the old client-side size-query parser) —> `$addFields` (`tier`: Flash Sale 0 / available 1 / booked-DP-sold 2, from a fresh `getProductInvoiceStatusMap()` scan since that status isn't a Product field; `produkBaruRank`: 0/1 from `getProdukBaruIds()`) —> `$sort` —> `$skip`/`$limit` (default 12). New `app/api/katalog/route.ts` (GET) serves every page after the first and every filter/search/sort change (`mode=ids` returns every matching *available* id, unpaginated, for "Pilih Semua"); `app/katalog/page.tsx` calls the same function directly for a server-rendered page 1 (plus a cheap `Product.countDocuments()` for the header's "N PRODUK TERSEDIA", since that's no longer implicit in a full fetch). `components/katalog/KatalogClient.tsx`: `items`/`cursor` state (starts as the server-rendered page 1), an `IntersectionObserver` sentinel below the grid (via a "latest ref" pattern so it always reads current filter state, not a stale mount-time closure) triggers the next batch on scroll, search/filter/sort changes debounce 350ms then replace the grid via a fresh page-1 fetch, "Pilih Semua" fetches the complete matching-id list only when picking starts (not on every render) since it needs every match, not just what's been scrolled into view. `CatalogPrintDoc.tsx` needed no changes (already independently, lazily fetches all products via `/api/products` on its own).

**Trade-off (flagged to the user in the plan before building):** search/filter/sort changes now cost a debounced network round-trip instead of being instant/local — unavoidable once the actual data pull is what's being reduced.

**Files affected:** `lib/katalog.ts`, `app/api/katalog/route.ts` (new), `app/katalog/page.tsx`, `components/katalog/KatalogClient.tsx`.
**Regression test:** Clean build, lint clean. Verified live against real data (`next start` + direct fetch/Playwright, established pattern this session): page 1 renders exactly 12 cards server-side with zero `/api/katalog` calls; scrolling fires one correctly-cursored request per batch (12→24→36→48, confirmed via response logging) with no duplicate/missing ids across a full 190-product paginated fetch (`_id` tiebreaker keeping pagination stable); typing a search query fires exactly one debounced request, not one per keystroke; "Pilih Semua" fetched a real 162-id available list independent of how many cards were scrolled into view; tier ordering (Flash Sale → available → booked/DP/sold), Produk-Baru-leads, category-ascending, and price-descending-within-category all checked programmatically across the complete paginated result set — zero violations found.

---

## TASK-013 — Owner-only: remove the diskon plafon entirely (up to 100% off)

**Type:** FEATURE
**Priority:** P2
**Status:** DONE (2026-09-05)
**Dependency:** None
**Created:** 2026-09-05 · **Last updated:** 2026-09-05

**Description:** Per the user's request ("khusus untuk owner hojay, plafon diskon di hilangkan, jadi bisa untuk diskon sampai 100% nilai barang"). Confirmed via AskUserQuestion: scoped to role `owner` only (NOT `super_admin` — narrower than the app's usual owner+super_admin pairing for top-tier features), and applies everywhere a diskon plafon exists: new invoice, edit invoice, per-line diskon on the cart/Katalog card, AND Diskon Bulk — not just one of them.

**Fix:** `maxDiskonBaru()`/`maxDiskonBekas()` (`lib/commission.ts`) gained an `unlimited` param — when true, returns `hargaJual` itself (the diskon can reach the full sale price, net Rp0) instead of the usual protected-margin cap. `allocateBulkDiskon()`/`diskonCapUnit()` thread the same flag through. Server-side (the actual enforcement — `createInvoice.ts`/`updateInvoice.ts`) resolves `isOwner` from the **current session's role**, never a client-supplied field: both `app/api/invoices/route.ts` (POST) and `app/api/invoices/[id]/route.ts` (PATCH) now pass `{ isOwner: session?.role === "owner" }` into the service functions. Client-side (`InvoiceForm.tsx`, `ItemRowEditor.tsx`, `ProductCard.tsx`) mirrors the same check purely for instant UI feedback (no clamp/warning shown to an Owner) — the server clamp is what actually matters.

**Found and fixed along the way:** `EditInvoiceLoader.tsx` (the `/invoice/[id]/ubah` edit flow) never threaded `currentUser` through to `InvoiceForm.tsx` at all — only the create flow (`/invoice/baru`) did. Without fixing this, `isOwner` would have silently stayed `false` on every edit regardless of who was logged in, missing half of the confirmed scope. Added `currentUser` to `EditInvoiceLoader`'s props, threaded from `app/invoice/[id]/ubah/page.tsx`'s own `session` (already fetched there for the existing `isInvoiceBlockedForSession` check).

**Files affected:** `lib/commission.ts`, `lib/services/createInvoice.ts`, `lib/services/updateInvoice.ts`, `app/api/invoices/route.ts`, `app/api/invoices/[id]/route.ts`, `components/invoice/{ItemRowEditor,InvoiceForm,EditInvoiceLoader}.tsx`, `app/invoice/[id]/ubah/page.tsx`, `components/katalog/{ProductCard,KatalogClient}.tsx`, `app/katalog/page.tsx`.
**Regression test:** Clean build; lint diff shows only the pre-existing `react-hooks/set-state-in-effect` (InvoiceForm.tsx x2, ItemRowEditor.tsx x1 — all in effects untouched by this change). Verified live end-to-end against a real Bekas product (hargaJual 1.800.000, hargaMinimum 1.300.000): a minted Owner session's `POST /api/invoices` requesting a full 1.800.000 diskon stored exactly that (no clamp); the identical request under a Manager session was correctly clamped to 630.000 (`maxDiskonBekas`'s normal cap) — confirming the Owner override and the still-enforced normal cap coexist correctly. Test invoices deleted after verification.

---

## TASK-014 — Simplify Komisi% to one field on the product form

**Type:** UX/UI
**Priority:** P2
**Status:** DONE (2026-09-05)
**Dependency:** None
**Created:** 2026-09-05 · **Last updated:** 2026-09-05

**Description:** User reported (with a screenshot) two separate commission-percent fields on the product edit form — "Komisi — Persen" and "Komisi Bekas — Override (%)" — as confusing, and asked for one column. Investigated and explained to the user before changing anything (per this project's own SDD discipline): the two fields are NOT duplicates, they drive genuinely different things — "Komisi — Persen" never actually drives real invoice commission (baru is always a hardcoded flat 6%, bekas uses the other field), it only feeds `komisiNominal`, which in turn feeds one of Dashboard's three "Hot Products" carousel rankings (the "insentif" badge, `getHotProducts()` in `lib/dashboard.ts`, sorted by `komisiNominal` descending). "Komisi Bekas — Override (%)" is the field that really does drive `computeLineCommission()` for bekas sales. Explained this trade-off (removing the first field means every bekas product ties at the same 10%/hargaRekomendasi ratio for that one Hot Products ranking, degrading it to effectively "highest-priced bekas product") — user confirmed they still want one field regardless.

**Fix:** Removed "Komisi — Persen" as a visible/editable input in `ProductForm.tsx` (shared by both Inventory's edit page and Katalog's `EditProductDrawer.tsx` — same component, one fix covers both entry points). `komisiPercent` still auto-tracks kondisi under the hood exactly as before (6% baru / 10% bekas, unchanged `setKondisi` logic), so `komisiNominal`/Hot Products keep computing without erroring — Owner just can't manually override that one number per product anymore. The remaining single field ("Komisi Bekas (%)", renamed from "Komisi Bekas — Override (%)" since it's now the only commission control) still only shows for `kondisi === "bekas"` — for "baru" products, no commission field shows at all, matching reality (always flat 6%, no override concept exists there).

**Files affected:** `components/produk/ProductForm.tsx`.
**Regression test:** Clean build, lint diff shows only one pre-existing `react-hooks/set-state-in-effect` (an unrelated localStorage-last-category effect, untouched by this change). Verified live as Owner against real products: a bekas product's edit page now shows exactly one commission-related label ("Komisi Bekas (%)"); a baru product's shows none; saving the bekas product unchanged still returns 200 and correctly persists `komisiPercent: 10`/`komisiNominal` recalculated to match (10% × hargaRekomendasi) — confirming the auto-tracking and Komisi Nominal display still work with the input gone.

---

## TASK-015 — Commission settings: narrow to Owner-only (was also allowing Super Admin)

**Type:** BUGFIX/SCOPE
**Priority:** P2
**Status:** DONE (2026-09-05)
**Dependency:** None
**Created:** 2026-09-05 · **Last updated:** 2026-09-05

**Description:** Per the user's request ("yang hanya boleh akses setting komisi hanya owner"). Every commission-setting surface built since TASK-006 (2026-09-03) used the app's usual owner-level pairing — `["owner", "super_admin"]` — copy-pasted independently into 4 different files, even though `app/api/products/[id]/komisi-bekas/route.ts`'s own error message already claimed "Hanya Owner" (a pre-existing inconsistency between the message and the actual check). Also found while auditing: `KatalogClient.tsx`'s `EditProductDrawer` was passed `isOwner={canFlashSale}` (Owner+Super Admin, matching Flash Sale's role set) instead of a real owner-only check — a stray leftover from before TASK-013 added a genuinely owner-only `isOwner` prop to that same component for the diskon-plafon feature.

**Fix:** New `KOMISI_SETTING_ROLES = ["owner"]` / `isKomisiSettingAllowed()` in `lib/auth/access.ts` — one canonical definition instead of 4 independent copies that could (and did, silently, re: the error-message mismatch) drift apart. Applied to: `app/api/products/[id]/komisi-bekas/route.ts` (PATCH, the real enforcement for a product's Komisi Bekas override + the internal Komisi — Persen figure), `app/api/categories/[id]/route.ts` (PATCH, a category's default Komisi Bekas rate), `app/produk/[id]/edit/page.tsx` + `app/produk/baru/page.tsx` (Inventory's `isOwner` prop into `ProductForm.tsx`), `app/admin/page.tsx` (`CategoryManager`'s Komisi Bekas column/edit-form), and `components/katalog/KatalogClient.tsx` (its `EditProductDrawer`'s `isOwner`, now reusing the already-correct owner-only `isOwner` prop from TASK-013 instead of `canFlashSale`).

**Files affected:** `lib/auth/access.ts`, `app/api/products/[id]/komisi-bekas/route.ts`, `app/api/categories/[id]/route.ts`, `app/produk/[id]/edit/page.tsx`, `app/produk/baru/page.tsx`, `app/admin/page.tsx`, `components/katalog/KatalogClient.tsx`.
**Regression test:** Clean build, lint clean on every file. Verified live end-to-end with minted Owner vs Super Admin sessions: `PATCH /api/products/[id]/komisi-bekas` — Owner 200 (value persisted), Super Admin 403 ("Hanya Owner yang bisa mengatur Komisi"); UI-level, all three entry points checked directly (Inventory's edit page, Katalog's EditProductDrawer via a real search-then-click flow, Admin's Kelola Kategori table) — Owner sees the Komisi field/column in every one, Super Admin sees it in none.
