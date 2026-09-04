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
