# HOJAY — Change Log

> Newest first. See `TASKS.md`/`BUGS.md` for the full task/bug detail behind each entry.

---

## 2026-09-08

**TASK-021 done** — Invoice list's Preview drawer gained a "Surat Jalan" tab (next to Invoice and the still-conditional Bukti Transfer), each with its own "Unduh ... (PDF)" button, so both documents can be previewed/downloaded straight from `/invoice` without opening `/invoice/[id]`. Mid-review the user asked for one more thing: a driver name typed once should actually show up in the on-screen preview (not just silently feed the PDF) — opening the tab for the first time now prompts for it immediately, shows it live in the preview, and offers an "Ubah" link to correct it; the detail page's own download still prompts fresh every click, unchanged. Extracted the shared PDF-building logic out of `InvoiceActions.tsx` into a new `useInvoicePdfDownload()` hook so the list didn't duplicate it.

Tasks done: TASK-021.
Regression: PARTIAL — clean build, lint clean on all 4 touched files; manual trace of the prop/state wiring plus an interactive HTML mockup, but no live DB-backed browser pass this time (Playwright unavailable, session-minting blocked by this sandbox's own security classifier) — flagged to the user rather than claimed.

---

## 2026-09-07

**TASK-020 done** — Invoice list's 4 stat cards (Perlu ditindak/Belum bayar/Sudah DP/Lunas {bulan} — each independently clickable, each showing its own fixed count regardless of which pill was active) collapsed into 2 plain, non-clickable cards: "Jumlah Invoice" and "Total Nilai Invoice", both now tracking whichever pill filter is currently active. "Total Nilai Invoice" sums the remaining sisa tagihan for "Sudah DP" and the full grandTotal for every other filter, so it never blends "already paid" and "still owed" into one misleading figure the way a single flat sum would have. Went through 3 rounds of confirmation with the user, including a genuine design correction mid-way (their first-round proposal — summing raw grandTotal always — was flagged as breaking for the "Semua" view before being redesigned).

Tasks done: TASK-020.
Regression: PASS — clean build, lint clean; verified live across all 5 pill states with Playwright, numbers cross-checked by hand against the visible rows for "Belum Dibayar" and "Sudah DP".

---

## 2026-09-07

**TASK-019 done, BUG-018 fixed** — Deleting a product is now Owner-only everywhere it appears (Inventory's list and a new "Hapus" button in Katalog's edit pencil) — this used to have zero role restriction at all on Inventory. Inventory's list also now shows "Ukuran" (dimensions) right under each product's name, on both desktop and mobile, with the SKU text shrunk slightly to make room. Separately, the Beranda bell's "Produk baru ditambahkan" notification was linking straight to the product's edit page instead of Katalog — now matches the Flash Sale notification's own `/katalog` link.

Tasks done: TASK-019. Bugs fixed: BUG-018.
Regression: PASS — clean build, lint clean; verified live against a production build with minted Owner/Manager sessions (delete: Manager 403, Owner 200; Owner's Inventory page rendered 368 "Hapus" occurrences, Manager's rendered 0), Playwright screenshots confirmed Ukuran placement on both viewports, and `/aktivitas` confirmed all 66 "Produk baru ditambahkan" entries now link to `/katalog`.

---

## 2026-09-07

**TASK-018 done** — New "Unduh Surat Jalan (PDF)" on the invoice detail page: same document as the Invoice, but with every price stripped out, title swapped to "SURAT JALAN", and a driver name. Went through 2 mockup rounds (layout, then exact button placement) before coding. The driver name is deliberately never stored anywhere — typed fresh via a new `prompt()` (extending the app's existing styled dialog system) each time the PDF is generated, since the assigned driver can change per dispatch.

Tasks done: TASK-018.
Regression: PASS — clean build, lint clean; verified live (Surat Jalan DOM has zero price figures/Payment Details, regular Invoice PDF unchanged, real download triggered with the typed driver name, cancel correctly aborts with no download).

---

## 2026-09-07

**BUG-017 fixed** — "Bukti Transfer"'s "Buka ukuran penuh" opened a new browser tab with no obvious way back on mobile. Reused ZoomableImage.tsx (same pattern already proven for Katalog product photos) — clicking the bukti image now opens an in-app full-screen overlay with a real close button instead. PDF uploads still open in a new tab (no in-app viewer to reuse).

Bugs fixed: BUG-017.
Regression: PASS — clean build, lint clean; verified live (in-app overlay confirmed, zero new tabs opened).

---

## 2026-09-07

**TASK-017 done** — Katalog's Filter sidebar Harga Rekomendasi/Harga Bottom toggle now changes every product's displayed price app-wide, not just the min/max range filter's comparison basis. Confirmed with the user this is a full reset (clears every per-card override and typed custom price too, not just a fallback default). `CatalogSelectionProvider.tsx` gained a persisted `defaultPriceMode` + `setGlobalPriceMode()`.

Tasks done: TASK-017.
Regression: PASS — clean build, lint clean; verified live (all 12 loaded cards flipped to Harga Bottom, displayed prices changed to match).

---

## 2026-09-07

**BUG-016 fixed** — "Avi" and "Avicenna Pangaran" showed as two separate people on the Insentif leaderboard (User/Sales records were already correctly merged; 11 older invoices and 1 customer still carried the pre-rename name "Avi" as a plain string snapshot). Pure data correction, no code change — updated exactly those 12 documents after confirming no other collection still had the stale name.

Bugs fixed: BUG-016.
Regression: PASS — verified live: zero remaining "Avi" on any invoice, leaderboard shows one unified name.

---

## 2026-09-07

**TASK-016 done** — Invoice list's Preview drawer gets an "Invoice"/"Bukti Transfer" tab pair (Invoice shown by default), surfacing the proof-of-transfer already captured by PaymentForm.tsx/DpForm.tsx but never viewable anywhere. Two mockup rounds first, per the user's explicit requests — one to see the layout before coding, one rebuilt with the app's real Tailwind classes/tokens instead of hand-approximated CSS. Only shows when the invoice actually has a bukti (cash payments have none); shows both DP and settlement proof separately when both exist.

Tasks done: TASK-016.
Regression: PASS — clean build, lint clean; verified live against real invoices with real uploaded proof files.

---

## 2026-09-06

**BUG-015 fixed** — Katalog's "Pilih Semua" replaced the whole selection with just the current search's matching products instead of adding to it, so picking under one search then searching again and picking more silently dropped the first batch. Now merges (union) instead of replacing, still supporting "click again to deselect" scoped to the current search only.

Bugs fixed: BUG-015.
Regression: PASS — clean build, lint clean; verified live (Cabinet 15 + Meja 6 = 21, confirmed via both the UI count and the raw persisted selection).

Also checked the same day: whether a Lunas invoice still shows its Riwayat — confirmed already working correctly against a real paid invoice, no fix needed.

---

## 2026-09-05

**TASK-015 done** — Every commission-setting surface (product's Komisi Bekas override, category's default rate) now Owner-only, not Owner+Super Admin like before. Consolidated 4 separate `["owner","super_admin"]` copies into one `KOMISI_SETTING_ROLES`/`isKomisiSettingAllowed()` in `lib/auth/access.ts`. Also found and fixed a stray leftover: Katalog's EditProductDrawer was still keying its commission-field visibility off `canFlashSale` (Owner+Super Admin) instead of the real owner-only check.

Tasks done: TASK-015.
Regression: PASS — clean build, lint clean; verified live with minted Owner/Super Admin sessions (API PATCH: Owner 200, Super Admin 403; UI: all 3 entry points checked directly).

---

## 2026-09-05

**BUG-014 fixed** — "Komisi Nominal" on the product form stopped reacting to input right after TASK-014 (same day) removed "Komisi — Persen" — it was still computed from that now-invisible field. Recomputed from the real commission formula instead (Harga Bottom × Komisi Bekas% for kondisi Bekas, flat 6% × Harga Rekomendasi for Baru), so it now updates live with whatever's actually being typed. Display-only fix — the DB-stored `komisiNominal`/Hot Products are untouched.

Bugs fixed: BUG-014.
Regression: PASS — clean build, lint clean; verified live (20%/15%/empty all produced the exact correct Rupiah figure against Harga Bottom).

---

## 2026-09-05

**TASK-014 done** — Product edit form (Inventory + Katalog's drawer, same shared `ProductForm.tsx`) now shows only ONE commission field instead of two confusing ones. Removed "Komisi — Persen" (never drove real invoice commission — only fed one of Dashboard's Hot Products rankings, explained this trade-off to the user before removing) as a visible input; it still auto-tracks kondisi (6%/10%) under the hood so Komisi Nominal/Hot Products keep working. "Komisi Bekas (%)" remains as the one real commission control, shown only for kondisi Bekas.

Tasks done: TASK-014.
Regression: PASS — clean build; verified live as Owner (bekas product shows exactly one commission label, baru shows none, save still persists komisiPercent/komisiNominal correctly).

---

## 2026-09-05

**TASK-013 done** — Owner role (only, not Super Admin) can now set diskon up to 100% of an item's value everywhere a plafon existed (new/edit invoice, per-line cart/Katalog diskon, Diskon Bulk). `maxDiskonBaru`/`maxDiskonBekas` gained an `unlimited` param, resolved server-side from the session role (never trusted from the client). Along the way, found and fixed a real gap: the edit-invoice flow never passed the logged-in user down to `InvoiceForm.tsx` at all, which would have silently left this not working for Owner-edited invoices.

Tasks done: TASK-013.
Regression: PASS — clean build; verified live (minted Owner vs Manager sessions against a real product): Owner's requested 1.800.000 diskon stored in full, Manager's identical request correctly clamped to 630.000.

---

## 2026-09-05

**TASK-012 done** — Katalog's data pull is now server-paginated (12 products/batch, real infinite scroll via IntersectionObserver) instead of fetching every matching product on every load. Filtering/sorting/grouping moved into a shared MongoDB aggregation (`lib/katalog.ts`'s `queryKatalogProducts`) reused by page 1 (server-rendered) and every subsequent page/filter change (new `app/api/katalog/route.ts`). Also changed the default sort order to Produk Terbaru → Kategori → Harga (termahal dulu), per the user's explicit spec — the existing Harga dropdown fully overrides this when picked.

Tasks done: TASK-012.
Regression: PASS — clean build, lint clean; verified live end-to-end (correct per-batch cursors across a full 190-product paginated fetch, zero duplicate/missing ids, debounced search, "Pilih Semua" fetching the complete matching set, and zero tier/sort-order violations across the whole catalog).

---

## 2026-09-04

**TASK-011 done** — "Kirim ke Pelanggan (WA)" on the invoice detail page now attaches the PDF directly via the Web Share API where the OS supports it (mobile), instead of always requiring a manual download-then-attach. Falls back to the original text-only wa.me link on desktop. Explained to the user why a `wa.me` link alone could never do this (no public file-attach parameter), and why the target number still can't be auto-picked once WhatsApp opens (OS/app-side limitation).

Tasks done: TASK-011.
Regression: PASS — clean build, lint clean; both the share path and the desktop fallback verified live with a real invoice and real PDF bytes.

---

## 2026-09-04

**BUG-013 fixed** — "Kirim WA" on the Invoice list opened a wa.me link with the customer's number still in local format ("0812..."), which silently fails to load a chat. `InvoiceActions.tsx`'s detail-page WA button already did the "0"→"62" conversion; centralized it as `toWaPhone()` in `lib/format.ts` and pointed both buttons at it.

Bugs fixed: BUG-013.
Regression: PASS — clean build, lint clean; every real invoice's WA link checked live, all now `62...`.

---

## 2026-09-04

**TASK-009 follow-up #3** — the periode filter's actual layout bug, per the user's report and "buat dulu planya di html" request: published a mockup, got sign-off, then fixed it for real. `InvoicePeriodFilter.tsx` now renders a Fragment (not its own wrapping flex div) so its two selects sit as direct siblings of the search box in one row; also found the shared `Select`'s `w-full` base class was beating a same-specificity `w-auto` override, fixed with `!w-auto`. Bulan/Tahun now only list months/years that actually have invoice data (new aggregation, replacing the old hardcoded 5-year window).

Tasks done: TASK-009 (follow-up).
Regression: PASS — clean build, lint clean; verified live via real DOM measurement (single row, correct widths) and the actual rendered option lists.

---

## 2026-09-04

**TASK-010 done** — Andi abdillah (Owner, whose login name happens to exactly match a real Sales roster entry) no longer appears on Payroll's Daftar Bayar commission list. `getUnpaidCommissionBySales()`/`getUnpaidCommissionInvoices()` now exclude any sales name belonging to a `role: "owner"` User account — scoped to role, not the one name, and Payroll-only (Insentif leaderboard/Komisi Saya untouched).

Tasks done: TASK-010.
Regression: PASS — clean build, lint clean, verified live: Andi abdillah's Rp 15.103.000 row is gone, every other sales rep's total unchanged.

---

## 2026-09-04

**BUG-012 fixed** — the "tidak bisa generate invoice" report from earlier today turned out to be a real crash, not a false alarm: `app/invoice/[id]/page.tsx` broke for every single invoice (React error #441 — "This page couldn't load", the exact interstitial the user's screenshot showed). Root cause was TASK-009's own `InvoiceDocument.tsx` extraction, done the same day: it called `displayDiskon()`/`displayHarga()` as value imports from `InvoicePrintDoc.tsx`, a `"use client"` file, from a Server Component. Moved those two pure functions (plus their shared types) into a new plain module `lib/invoiceDisplay.ts`. Reproduced live (`next start` + Playwright, server log confirmed the exact throw) before and after the fix.

Bugs fixed: BUG-012.
Regression: PASS — clean build, lint clean, `/invoice/[id]` and `/invoice` both verified error-free after the fix.

---

## 2026-09-04

**TASK-009 follow-up #2** — the Bulan/Tahun periode selects sat visibly taller than the search box next to them; overrode their sizing to match `SearchInput` exactly, confirmed level via screenshot. Also investigated a "tidak bisa generate invoice" report (no error given) — reproduced the create flow at the service, API, and full-browser-form level, all succeeded every time; asked the user for the specific error instead of guessing a fix.

Tasks done: TASK-009 (follow-up).
Regression: PASS.

---

## 2026-09-04

**TASK-009 follow-up** — added a Bulan/Tahun periode filter to `/invoice` (new `InvoicePeriodFilter.tsx`, both defaulting to "Semua"). Filters server-side via `tanggalInvoice`, not client-side. "Lunas {month}" stat card stays anchored to the real current month regardless of the periode picked (separate `countDocuments`, not derived from the fetched/filtered list).

Tasks done: TASK-009 (follow-up).
Regression: PASS.

---

## 2026-09-04

**TASK-009 done** — Invoice list (`/invoice`) rebuilt as one flat list filtered by a status pill toggle + click-to-filter stat cards (Semua/Belum Dibayar/Sudah DP/Draft/Sudah Lunas), replacing the old stacked-sections layout — an interim "3 sections" mockup was explicitly rejected first. Every row gets a "Preview" button opening a drawer with the real invoice document, no page navigation. Extracted the on-screen document into `InvoiceDocument.tsx` (shared with `/invoice/[id]`, which is otherwise unchanged) so the two views can't drift apart. The day block is now always the invoice's own date for every status; the unpaid "N hari" urgency signal moved to its own separate badge.

Tasks done: TASK-009.
Regression: PASS.

---

## 2026-09-04

**TASK-008 follow-up #2** — "Detail Invoice" was also meant as the Daftar Bayar table's own column header, not just the pop-up's title — that column had no label at all. Added it, widened the column to fit.

Tasks done: TASK-008 (follow-up).
Regression: PASS.

---

## 2026-09-04

**TASK-008 follow-up** — 3 fixes to the Komisi detail pop-up per the user's report: Detail button moved to its own column (was cramped into the Sales cell), Status column widened so its label stops wrapping to two lines and throwing row alignment off, drawer title now reads "Detail Invoice", and each invoice number in the pop-up links straight to `/invoice/[id]`.

Tasks done: TASK-008 (follow-up).
Regression: PASS.

---

## 2026-09-04

**TASK-008 done** — Bayar Komisi's Daftar Bayar list gets a "Detail (N invoice)" pop-up per row — reuses the existing per-sales invoice breakdown + pay form (`KomisiPaymentForm.tsx`, previously only reachable via `/payroll/komisi/[nama]`) in a drawer instead of navigating away, so the batch checkbox selection isn't lost. Same data, same pay endpoint as the standalone page — the number shown and the number paid can't drift apart. Confirmed separately (per the user's question) that commission payout was already `status: "paid"`-only at every layer (list, detail, and the actual payout's own server-side re-check) — no change needed there.

Tasks done: TASK-008.
Regression: PASS.

---

## 2026-09-04

**TASK-007 done** — Akun Login (`/admin/akun`) restricted to Owner/Super Admin, reversing a 2026-08-27 decision that had Manager included. Found while investigating a "Komisi Saya" Rp 0 report — turned out to be a data mismatch (a Manager's login `nama` ≠ their Sales roster name), not a code bug, left for the user to correct via Akun Login. The 2 account-management API routes had no role check of their own (only the general `/api/admin` middleware's `isAdminLevel`, which Manager satisfies) — added a dedicated check to both, same isolation pattern as Flash Sale/Komisi Bekas, so a raw request can't grant a role or reset a password either.

Tasks done: TASK-007.
Regression: PASS.

---

## 2026-09-04

**BUG-011 fixed** — Katalog's search box and the Invoice "Tambah Produk" sidebar's own search never matched Merk (only name/SKU/size) — a search for a brand like "Hosizaki" returned nothing even for active products carrying it, ever since TASK-005 made Merk a real separate field. The DB-backed searches (`/api/products`, Inventory) already had it right; only these two client-side JS filters had the gap. Added the same `merk` check to both.

Bugs fixed: BUG-011.
Regression: PASS.

---

## 2026-09-03

**TASK-003 follow-up #3** — re-running "Distribusikan" (typo, or a different total) found nothing to redistribute into, since the allocator only ever fills a Rp0 line and every line was already touched by the first run. Now tracks which lines Diskon Bulk itself last set (`lastBulkDiskon` in `InvoiceForm.tsx`) — a re-run overwrites its own previous split, a genuinely manual entry (or one edited since) stays protected.

Tasks done: TASK-003 (follow-up).
Regression: PASS.

---

## 2026-09-03

**BUG-004 corrected** — the same-day fix capped Baru/Custom diskon at the sale price itself (100%, no real ceiling). The user caught this once Diskon Bulk could concretely dump an entire request into one Baru line with nothing protecting it — "plafon itu kan berdasarkan, 1 selisih dari harga jual dengan harga bottom + komisi dari harga bottom". `maxDiskonBaru()` now mirrors `maxDiskonBekas`'s exact shape (`hargaJual − hargaMinimum + 6%×hargaMinimum`) instead. Also added the matching on-blur warning to the manual diskon field in Katalog/Invoice (was Bekas-only before).

Bugs fixed: BUG-004 (correction).
Regression: PASS.

---

## 2026-09-03

**TASK-003 follow-up** — Diskon Bulk's input used a plain `Input` (raw digits, "150000") instead of `CurrencyInput` (accounting-style thousand separators, "150.000") — the same component every other Rupiah field in the app already uses. Checked the allocator/`updateItem` logic itself first (no defect found) before concluding the formatting was the actual complaint.

Tasks done: TASK-003 (follow-up).
Regression: PASS.

---

## 2026-09-03

**TASK-003 done** — Diskon Bulk on Invoice: one total discount input + "Distribusikan" button in Ringkasan, auto-split across line items — Baru/Custom filled first (6x cheaper on commission per rupiah than Bekas), every per-unit diskon a clean Rp10.000 multiple, manual per-line entries and Flash Sale lines never touched. New `allocateBulkDiskon()`/`maxDiskonBaru()` in `lib/commission.ts`. Sanity-tested against 7 cases (split, over-capacity clamp, sub-step request, exact-cap, qty>1 rounding, manual-diskon skip, Flash-Sale skip) via a standalone script before wiring into the UI. Iterated placement/copy with the user first via an interactive HTML preview.

Also closes **BUG-004** — Baru/Custom diskon had no server-side ceiling at all (only Bekas was clamped); both `createInvoice.ts`/`updateInvoice.ts` now clamp it via the new `maxDiskonBaru()`.

Tasks done: TASK-003.
Bugs fixed: BUG-004.
Regression: PASS.

---

## 2026-09-03

**BUG-010 fixed** — Product names showed a stray "-" (e.g. "Working Table -") from TASK-005's Merk-in-name feature. Queried production directly: 135 of 225 products have `merk` literally stored as `"-"`, a pre-existing "no brand" data-entry convention, not empty. `productDisplayName()` now treats `"-"`/`"—"` the same as empty — fixes every existing product with no DB migration needed.

Bugs fixed: BUG-010.
Regression: PASS.

---

## 2026-09-03

**TASK-006 follow-up** — the pre-existing "Komisi — Persen" reference field was still visible/editable by Manager in the product form, inconsistent with the owner-only Komisi Bekas override just built. Per the user's direct correction ("manager tidak boleh untuk edit komisi, kolom insentif tidak boleh terlihat... hanya owner yang boleh"): the field and its Komisi Nominal readout are now hidden entirely (not just disabled) unless Owner/Super Admin, and moved server-side into the same Owner-only endpoint as Komisi Bekas (no longer in the general product PATCH's allowlist at all).

Tasks done: TASK-006 (follow-up).
Regression: PASS.

---

## 2026-09-03

**TASK-006 done** — Owner (+Super Admin) can now override the barang-bekas commission rate per product (`ProductForm.tsx`, Kondisi=Bekas only) and set a default per category (`CategoryManager.tsx`) — was a hardcoded flat 10% of Harga Minimum everywhere, with zero override capability. Hierarchy: product override → category default → global 10%. Baru/Custom (6%) and Flash Sale (7%) untouched, scope deliberately bekas-only per the user. Server-side (`createInvoice.ts`/`updateInvoice.ts`) always resolves and enforces the rate itself from the DB, same as every other commission input. New Owner-only `PATCH /api/products/[id]/komisi-bekas` (isolated from the general product PATCH, which never accepts this field). Also renamed the "Harga Minimum" label to "Harga Bottom" app-wide (display only, DB field name unchanged) and fixed a bug found along the way: `merk` was stuck behind `canEditProduct` in `app/katalog/page.tsx`, so a Sales rep's own Katalog view never actually got Merk data (TASK-005's fix silently didn't apply to them).

Tasks done: TASK-006.
Regression: PASS.

---

## 2026-09-02

**TASK-005 done** — Merk (brand) now shows automatically next to the product name on Katalog cards, the Katalog PDF, and the Invoice product picker (+ what gets snapshotted onto the invoice), instead of requiring it typed into Nama Produk by hand. New `productDisplayName()` helper in `lib/format.ts`; stored `name` field itself untouched.

Tasks done: TASK-005.
Regression: PASS.

---

## 2026-09-02

**TASK-005 follow-up** — confirmed `productDisplayName()` never shows a stray "-" when merk is empty (falls back to plain name). Closed 2 naming-consistency gaps the first pass missed: "Produk Custom" listing (`app/katalog/custom/page.tsx`) wasn't passing `merk` through to `ProductCard` at all, and "Pesan Produk Custom" (`app/katalog/custom-order/page.tsx`) added its new product to cart with the raw name, bypassing the helper. Both now match Katalog/PDF Katalog/Invoice.

Tasks done: TASK-005 (follow-up).
Regression: PASS.

---

## 2026-09-02

**BUG-009 fixed** — Katalog search couldn't match a full "80 x 60 x 100" size query, only a single number against one P/L/T dimension at a time. Not actually a regression (git history confirms this was never implemented), but fixed as reported: added shared size-query parsing to `KatalogClient.tsx` — splits on x/×/,/-/whitespace, every number typed must match one of panjang/lebar/tinggi (partial matching, order doesn't matter). Applies to both the main search box and the sidebar's manual Ukuran field; single-number queries behave exactly as before.

Bugs fixed: BUG-009.
Regression: PASS.

---

## 2026-08-31

**BUG-008 fixed** — Beranda (and `/follow-up`) showed a plain "Belum Bayar" badge for invoices that already had a DP recorded, since `Invoice.status` intentionally stays "unpaid" after a DP (only the balance changes). Added `hasDp` to `FollowUpInvoiceRow` and a new "Sudah DP" badge variant (same blue as Katalog's own DP badge); applied everywhere the shared follow-up badge/data is used — Beranda desktop (generic + sales-personalized), Beranda mobile sales row title, `/follow-up`'s table, and its mobile card list. Aggregate unpaid counts/totals deliberately untouched — a DP'd invoice still has money owed.

Bugs fixed: BUG-008.
Regression: PASS.

---

## 2026-08-31

**BUG-007 — root cause found and confirmed by actual reproduction, not guessing.** User reported the PDF export was still very slow and asked directly if something was leaking. Minted a real session JWT, drove headless Chromium (Playwright) against a genuine `next build && next start` (ruling out dev-mode Fast Refresh as a confound), pre-seeded 172 selected products, and captured live network traffic generating the PDF: confirmed the exact same explosive pattern from the user's own DevTools screenshot (thousands of requests, each product photo's grid thumbnail re-requested ~70 times). Root cause: `html2canvas` clones the live document on every one of the ~35-40 per-page captures a full-catalog PDF needs — the visible product grid (all its `next/image` thumbnails) sits in that same document the whole time, so every capture re-touched every visible image, not just the off-screen print doc's own photos.

Fix: the grid unmounts (not just CSS-hidden) while a PDF is being generated, so there's nothing left for each capture's clone to re-touch. Re-ran the exact same Playwright capture against the fix: request count stayed flat for 90+ seconds where the unfixed version had already blown past 1,459 by second 20.

Also tightened upload-time photo compression per the user's request (MAX_DIMENSION 1600px -> 1280px, JPEG_QUALITY untouched to avoid reintroducing blur) — new uploads only.

Bugs fixed: BUG-007 (root cause).
Regression: PASS — verified by re-running the same before/after network capture, not just a clean build.

---

## 2026-08-31

**BUG-007 corrected again (this time with real evidence)** — deferring CatalogPrintDoc's fetch wasn't enough; the user asked directly if something was leaking. Ruled out network/Atlas theories (confirmed with the user Atlas's IP Access List already allows 0.0.0.0/0; production's own unauthenticated response times are fast). Got a real DevTools Network-tab capture from production instead of guessing further: 661 requests, 130 MB of resources, mostly repeated Next.js Image Optimizer calls with "Pilih Semua" checked. Real cause: the Katalog product grid had no cap at all — it rendered all 206 (and growing) products simultaneously, each mounting its own image request. Added pagination (30 at a time, "Tampilkan Lebih Banyak" to reveal more) to `KatalogClient.tsx`; selection/PDF logic untouched, still operates on the full filtered list regardless of how many cards are painted to the screen.

Bugs fixed: BUG-007 (corrected again).
Regression: PASS.

---

## 2026-08-31

**BUG-007 corrected** — the earlier same-day "capture PDF pages concurrently" fix was wrong and made export slower per the user's follow-up report, not faster (Promise.all provided no real parallelism for html2canvas's mostly-synchronous work and likely raised peak memory instead). Reverted `KatalogClient.tsx` back to the proven sequential per-page loop.

Found the real contributor to BOTH "PDF slow" and "opening /katalog slow": `CatalogPrintDoc.tsx` is mounted globally (`app/layout.tsx`) and was fetching all products/categories/sales unconditionally on every single page mount across the whole app — including landing on `/katalog` itself, redundant with that page's own server-side fetch. Deferred the fetch to only fire once `pickMode` starts (first checkbox click), not on every mount. Ruled out (checked against the real DB, not guessed) the invoice-status-map query and product-grid image loading as bottlenecks — data volume (30 invoices, 206 products) is small, neither was the cause. No PDF quality/compression setting touched anywhere in this correction.

Bugs fixed: BUG-007 (corrected).
Regression: PASS.

---

## 2026-08-31

**BUG-006 + BUG-007 fixed** — Katalog PDF selection/export hardening, both per direct user reports.

BUG-006: unavailable products (fully Booked/Sudah DP/sold out) could still be checked for the PDF. Fixed at three layers — `ProductCard.tsx`'s checkbox now disables for an unavailable product, `KatalogClient.tsx`'s "Pilih Semua" only selects the available subset, and `CatalogPrintDoc.tsx` (the actual PDF source) re-filters by availability regardless of how an id got selected, so a stale selection can't slip through either.

BUG-007: PDF generation was slow for larger selections — each page was captured by `html2canvas` one at a time in a sequential loop. Changed to `Promise.all` so every page captures concurrently; render scale/JPEG quality (the settings that actually affect visual quality) untouched.

Bugs fixed: BUG-006, BUG-007.
Regression: PASS.

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
