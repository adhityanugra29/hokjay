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
- SUBTASK-005 Akuntansi — TODO.
- SUBTASK-006 Purchasing — TODO.
- SUBTASK-007 Payroll — TODO.
- SUBTASK-008 Admin — TODO.

**Acceptance criteria:** Same as TASK-001, applied per module; `grep -rln "border-2 border-ink"` across `app/`+`components/` returns only intentionally-document-styled surfaces (print docs, the invoice-preview `#invoice-doc`, ledger-style totals dividers).

**Files affected:** TBD per subtask.

---

## TASK-003 — Bulk Diskon (Invoice)

**Type:** FEATURE
**Priority:** P2
**Status:** READY (plan approved, execution explicitly paused by the user — "kamu lewati plan ini tapi ingati saya nanti")
**Dependency:** None (independent of TASK-002, just sequenced after it by the user's choice)
**Created:** 2026-08-30 · **Last updated:** 2026-08-30

**Description:** Full plan in memory ([[hojay-bulk-diskon-plan]]) and this repo should get its own detail doc once execution resumes. Summary: one total-discount input in Invoice's Ringkasan section, distributed across line items to (1) keep every customer-visible per-unit discount a clean multiple of Rp10.000, (2) minimize sales commission erosion (Baru/Custom items cost 0.06/rupiah vs Bekas's 1.0/rupiah — greedy-fill Baru/Custom first).

**Acceptance criteria:** `computeLineCommission`/`maxDiskonBekas` untouched (new pure functions only); server-side clamp added for Baru/Custom diskon (currently unclamped — see BUGS.md BUG-004); manual per-line diskon entries are never overwritten by the bulk allocator.

**Files affected (planned):** `lib/commission.ts`, `components/invoice/InvoiceForm.tsx`, `lib/services/createInvoice.ts`, `lib/services/updateInvoice.ts`.

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
