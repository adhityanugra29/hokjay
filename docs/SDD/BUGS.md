# HOJAY — Bug Registry

> Once recorded, a bug is never deleted — only its Status changes. Severity: B0 critical / B1 high / B2 medium / B3 low.

---

## BUG-001 — Katalog photo-zoom collapses into the card instead of covering the screen

**Severity:** B1
**Status:** FIXED (2026-08-30)
**Source:** User report ("fitur zoom eror di katalog")

**Description:** `ZoomableImage.tsx`'s full-screen preview is `position: fixed`, and the "Soft Trade" card redesign added a hover `transform: translateY(...)` on the card. Any CSS `transform` on an ancestor makes it that element's own containing block instead of the viewport — so the fixed overlay rendered clipped to the card's own box.

**Root cause:** `ProductCard.tsx`'s outer card div had `hover:-translate-y-0.5`.

**Fix:** Dropped the translate; kept `hover:shadow-md` as the hover cue (box-shadow doesn't create a containing block).

**Files:** `components/katalog/ProductCard.tsx`.
**Regression test:** Manually confirmed zoom opens full-screen while hovering the card. Documented in `docs/SDD/KNOWN_ISSUES.md` as a standing rule for future hover-transform additions.

---

## BUG-002 — Bare `rounded` class computes to 0px app-wide

**Severity:** B2
**Status:** FIXED (2026-08-30)
**Source:** Discovered while investigating the user's repeated "masih kaku" reports across several pages.

**Description:** `app/globals.css` sets `--radius-DEFAULT: 0` (the old flat "Rak & Rel" look). Bare `rounded` (no suffix) silently resolves to 0px, so anything using it — including `components/ui/Button.tsx`'s base class, used by nearly every `<Button>`/`<LinkButton>` in the app — kept hard square corners through multiple earlier rounds of "Soft Trade" work, because the buggy class name looked correct.

**Root cause:** Confusion between Tailwind's bare `rounded` utility (tied to `--radius-DEFAULT`) and the suffixed scale (`rounded-lg`, `rounded-xl`, `rounded-full`, unaffected by that override).

**Fix:** `rounded` → `rounded-lg`/`rounded-xl` in `components/ui/Button.tsx`, `Panel.tsx`, `Form.tsx`, and 6 more files found via `grep -rnP '\brounded\b(?!-[a-z0-9])'`.

**Files:** `components/ui/{Button,Panel,Form,UploadBox}.tsx`, `components/katalog/KatalogClient.tsx`, `components/invoice/{AddProductSidebar,InvoiceForm}.tsx`, `app/invoice/[id]/page.tsx`, `app/katalog/custom-order/page.tsx`.
**Regression test:** Re-ran the same grep after the fix — zero bare matches remain outside comments/already-correct `rounded-[10px]` usages.

---

## BUG-003 — Hidden yellow-on-white contrast in Dialog and Leaderboard

**Severity:** B2
**Status:** FIXED (2026-08-30)
**Source:** Proactive sweep after fixing BUG-002 (per the "actively hunt for bugs" rule).

**Description:** The accent color change (red → yellow, part of TASK-001) fixed every `bg-accent ... text-white` pairing found by a literal-adjacency grep, but two files built their className from one shared base class plus a conditional background, so `text-white` never sat next to `bg-accent` on the same line and was missed: `components/ui/Dialog.tsx`'s confirm button (used by every confirm/alert popup in the app), and `SalesBoard.tsx`/`MobileSalesBoard.tsx`'s rank-#1 leaderboard highlight (rank number, order count, progress bar all assumed a dark fill).

**Root cause:** Grep-based sweep only catches literal same-line adjacency, not classes composed via template-literal ternaries with a shared base.

**Fix:** Split the shared base per branch; flipped `text-white`/`bg-white` variants to `text-ink`/`bg-ink` wherever the branch's own background is the yellow accent.

**Files:** `components/ui/Dialog.tsx`, `components/insentif/SalesBoard.tsx`, `components/insentif/MobileSalesBoard.tsx`.
**Regression test:** Manually re-read every `isTop`/`dialog.danger` conditional in both files to confirm no remaining light-on-light or light-on-yellow pairing.

---

## BUG-004 — Barang Baru/Custom diskon has no server-side ceiling (commission can go negative)

**Severity:** B2
**Status:** FIXED (2026-09-03, alongside TASK-003)
**Source:** Discovered while designing TASK-003 (Bulk Diskon)'s algorithm.

**Description:** `lib/services/createInvoice.ts`/`updateInvoice.ts` clamp diskon for barang Bekas via `maxDiskonBekas()`, but Barang Baru/Custom has no equivalent clamp at all. Since `computeLineCommission` for Baru/Custom is `round((hargaJual - diskon) * 0.06)`, a raw API request (bypassing the client's own guards) with `diskon > hargaJual` would compute a NEGATIVE commission.

**Fix:** New `maxDiskonBaru(hargaJual, hargaMinimum)` in `lib/commission.ts`. Applied in both services to every Baru/Custom line (product-backed and custom-order, Flash Sale lines untouched — diskon's already locked at 0 there), mirroring the existing Bekas clamp exactly.

**Correction (2026-09-03, same day):** the first version capped at `hargaJual` itself (100% of the sale price, no real ceiling) — the user flagged this once Diskon Bulk could concretely dump an entire request into one Baru line with no protection ("sejak kapan plafon diskon itu 100% dari harga jual? plafon itu kan berdasarkan, 1 selisih dari harga jual dengan harga bottom + komisi dari harga bottom"). Rewritten to the exact same shape as `maxDiskonBekas` — `(hargaJual − hargaMinimum) + 6%×hargaMinimum` — just parameterized with the flat 6% baru/custom rate instead of the (possibly overridden) bekas rate. A true custom-order line (no backing product, `hargaMinimum` snapshotted as 0) correctly degrades back to `hargaJual` — there's no real Harga Bottom to protect there. Also added the matching on-blur clamp+warning to the manual per-line diskon field in `ProductCard.tsx`/`ItemRowEditor.tsx` (previously bekas-only), so a manually typed value gets the same client-side feedback as a bulk-allocated one.

**Files:** `lib/commission.ts`, `lib/services/createInvoice.ts`, `lib/services/updateInvoice.ts`, `components/katalog/ProductCard.tsx`, `components/invoice/ItemRowEditor.tsx`.
**Regression test:** Clean build, lint clean. Re-verified via the same manual sanity script: `maxDiskonBaru(1.5jt, 1jt)` now 560rb (was 1.5jt); a bulk request exceeding one line's new (smaller) cap correctly spills into the next-cheapest line instead of silently over-discounting the first.

---

## BUG-005 — Katalog price field can get silently stuck at Rp 0 (shows on-screen and in the exported PDF)

**Severity:** B1
**Status:** FIXED (2026-08-31)
**Source:** User report ("kenapa di katalog ada harga yang tulisannya 0" — a Katalog PDF shipped with a product priced at Rp 0).

**Description:** `ProductCard.tsx`'s price `CurrencyInput` select-all's its whole value on focus (so retyping doesn't just concatenate digits). If that retype gets interrupted before a new number is typed — click/tab away right after the select-all clears the field — the field blurs empty. `onChange` had already called `setCustomPrice(id, 0)` for the empty intermediate state, and the existing `onBlur` guard only corrected "positive but below `hargaMinimum`" — an empty/zero value fell through untouched. `getEffectivePrice()` treats a stored `0` as a real override (not "unset"), so the price stayed at Rp 0 indefinitely (persisted to `localStorage`, surviving reloads) until someone noticed and retyped it manually. Both the on-screen card and `CatalogPrintDoc.tsx`'s exported PDF read price from this same shared state, so the PDF shipped with Rp 0 too.

**Root cause:** No handling for the empty/zero case in the price field's blur validation — only the below-minimum case was guarded.

**Fix:** `onBlur` now also handles `num <= 0`: discards the custom-price override entirely (`setCustomPrice(id, undefined)`) instead of leaving `0` in place, falling back to whichever preset (Rekomendasi/Minimum) was active, and shows a warning explaining what happened — same pattern as the existing below-minimum warning. Confirmed via a direct DB query that no product actually has `hargaRekomendasi`/`hargaMinimum` ≤ 0 — this was purely the client-side stuck-state bug, not bad data.

**Files:** `components/katalog/ProductCard.tsx`.
**Regression test:** Clean build; manually traced the fix against the exact repro (focus → clear → blur before retyping) confirms the override is now dropped instead of persisted at 0.

---

## BUG-006 — Katalog PDF could include unavailable products

**Severity:** B2
**Status:** FIXED (2026-08-31)
**Source:** User request ("untuk katalog pdf, hanya boleh checklist produk yang tersedia, pastikan ya").

**Description:** The pick-mode checkbox on every `ProductCard` and the "Pilih Semua" control in `KatalogClient.tsx` let a sales rep check ANY product for the PDF export, including ones already at `availableQty <= 0` (fully Booked/Sudah DP/sold out) — nothing blocked selecting an item with nothing left to actually sell.

**Root cause:** No availability check anywhere in the selection path (per-card checkbox, "Pilih Semua", or the PDF's own product filter).

**Fix:** Three layers, so a stale selection can't slip through even if it predates a stock change: (1) `ProductCard.tsx`'s checkbox is now `disabled` + dimmed for an unavailable product, with a tooltip explaining why; (2) `KatalogClient.tsx`'s "Pilih Semua" only ever selects/counts the currently-available subset of what's on screen; (3) `CatalogPrintDoc.tsx` — the actual authoritative source for what goes into the PDF — re-filters `selectedProducts` by the same availability formula regardless of how an id ended up in the selection set (e.g. checked while in stock, sold out to someone else before the PDF was generated).

**Files:** `components/katalog/ProductCard.tsx`, `components/katalog/KatalogClient.tsx`, `components/cart/CatalogPrintDoc.tsx`.
**Regression test:** Clean build. Manually confirmed the availability formula (`stok - bookedQty - dpQty`) is applied identically in all three places.

---

## BUG-007 — Katalog PDF/page slow (Katalog PDF generation + opening the Katalog page)

**Severity:** B1
**Status:** FIXED (2026-08-31)
**Source:** User reports — first "lama sekali untuk proses pembuatan katalog untuk bisa di download pdf", then after the first attempted fix, "masih sangat lambat, bahkan lebih buruk dari sebelum layout terbaru" and a hard target: PDF export and opening `/katalog` both under 1 second.

**First attempt (WRONG, reverted same day):** Guessed the sequential per-page `html2canvas` `for` loop was serializing work unnecessarily and changed it to `Promise.all`, capturing every page "concurrently". This did not help and the user reported it made things worse. Root issue with the theory: by the time capture starts, every image is already loaded (awaited earlier in the same function) — there's essentially no I/O left for html2canvas to overlap, so it's almost entirely synchronous DOM-clone + canvas-rasterize work, which JS's single thread can't actually run concurrently regardless of how the promises are scheduled. `Promise.all` just kept every page's cloned subtree + canvas alive in memory simultaneously instead of one at a time being processed and released — plausibly *increasing* peak memory/GC pressure instead of speeding anything up. Reverted back to the sequential loop (proven working before any of this).

**Actual root cause found (page-open speed):** `CatalogPrintDoc.tsx` is mounted globally in the root layout (`app/layout.tsx`) — it fetches `/api/products` (all products, again — the page it sits on/near already fetched the same data server-side), `/api/categories`, and `/api/sales` unconditionally on every single mount, unguarded by whether the user is anywhere near the Katalog PDF feature. That means **every page load across the whole app**, and especially landing on `/katalog` itself, paid for three extra API calls this component's own export doesn't need until someone actually starts picking products for a PDF.

Ruled out (checked directly against the DB, not guessed): `getProductInvoiceStatusMap()`'s unbounded `Invoice.find({status:"paid"})` scan — only 30 invoices / 23 paid / 206 products in the real data, indexed on `status`, not a real bottleneck at this scale. Katalog's own product-grid thumbnails already use `next/image` (lazy-loaded, per an earlier 2026-08-28 fix) — also not the culprit.

**Fix:** `CatalogPrintDoc.tsx`'s fetch effect is now gated on `pickMode` (from `CatalogSelectionProvider`) instead of firing unconditionally on mount — it only fires once, the first time `pickMode` flips true (same "fetch once per session" semantics as before, just deferred), giving it the whole browsing-and-checking-boxes window to finish well before "Unduh Katalog PDF" is ever clicked. `KatalogClient.tsx`'s existing wait-for-`data-ready` poll still covers the rare case it hasn't finished. `KATALOG_PDF_RENDER_SCALE`/`KATALOG_PDF_JPEG_QUALITY` (the settings that actually affect visual quality/compression, already deliberately tuned once before after a blur complaint) were not touched by any part of this — confirmed nothing about image compression was removed.

**Files:** `components/katalog/KatalogClient.tsx` (reverted to sequential), `components/cart/CatalogPrintDoc.tsx` (deferred fetch).
**Regression test:** Clean build. No change to per-page PDF output or image compression — only when the background fetch fires.

**Second correction (evidence-based, 2026-08-31):** Still not enough — user reported it was still very slow and asked directly whether something was leaking. Tried to reproduce locally first (`npm run dev`, minted a real session JWT to hit the actual authenticated routes) but this sandbox itself can't reach MongoDB Atlas reliably (`MongoNetworkTimeoutError`/`MongooseServerSelectionError`) — that made local timings meaningless, and was honestly reported as such rather than presented as real data. Confirmed the *deployed* production site's own unauthenticated response times are fast (0.2-1.3s), and the user confirmed Atlas's Network Access list already allows `0.0.0.0/0` — so the network-layer theories were dead ends.

Asked the user for a real DevTools Network-tab capture from production instead of guessing again. It showed **661 requests, 130 MB of resources**, mostly repeated `image?url=...` (Next.js Image Optimizer) calls, with "Pilih Semua" checked. Root cause: the product grid (`KatalogClient.tsx`) had **no cap at all** — it always rendered every `filtered` product simultaneously, each `ProductCard` mounting its own `next/image` request. With 206 products in the catalog today (and growing over time — which also explains "sebelumnya tidak masalah", the catalog was smaller then), that's 206 cards' worth of images all loading at once on every single page load, independent of the PDF export code touched in the two attempts above.

**Fix:** `KatalogClient.tsx` now renders only `GRID_PAGE_SIZE` (30) products at a time, with a "Tampilkan Lebih Banyak" button to reveal more; resets to the first page on search/filter/sort change. "Pilih Semua" and the PDF export are untouched — both still operate on the full `filtered`/`availableFiltered` arrays regardless of how many cards are currently painted to the screen, only what's rendered/mounted is capped.

**Files (this correction):** `components/katalog/KatalogClient.tsx`.
**Regression test:** Clean build. Filter/sort/search/selection/PDF logic unchanged — verified by reading the diff, only the render slice + a page-size button were added.

**Third correction (2026-08-31) — the real PDF-generation bug, found by actually reproducing it:** Pagination helped opening `/katalog`, but the user reported the PDF export was still very slow ("bahkan lebih buruk", asked directly if something was leaking). This time, instead of guessing, actually reproduced it: minted a real session JWT, drove a headless Chromium (Playwright) against a real `next build && next start` (a genuine production-equivalent local server, specifically to rule out dev-mode Fast Refresh as a confound), pre-seeded 172 products as selected, and captured every network request while generating the PDF.

**Confirmed finding:** requests grew from ~220 to 1,459+ within the first 20 seconds alone, and kept climbing — the exact same explosive pattern the user's own DevTools screenshot showed (6,306 requests / 1,467 MB). Every individual product photo's `_next/image?url=...` URL (the GRID's own thumbnail, not the print doc's photo) was requested **~70 times each**, growing in waves that lined up almost exactly with the total count of unique images — once per several seconds, for the ENTIRE duration `downloadCatalogPDF()`'s per-page `html2canvas()` loop ran (roughly one wave per page captured, ~35-40 pages for 172 products).

**Root cause:** `html2canvas` clones the live document on every single page capture to render it safely off-screen. The Katalog product grid (with all its `next/image` thumbnails) sits in that same document the whole time a PDF is being generated — so every one of the ~35-40 per-page captures re-touched every visible grid image, not just the off-screen print doc's own photos. This compounds directly with page count, which is why a full-catalog PDF (172-206 products) was so much worse than a small one.

**Fix:** the grid is now swapped for a plain text placeholder (not just hidden via CSS — actually removed from the DOM) while `downloading` is true, so there's nothing left for html2canvas's per-capture clone to re-touch. Verified by re-running the exact same Playwright capture against the fixed build: request count stayed flat (~222, matching the pre-download baseline) for 90+ seconds straight where the unfixed version had already exceeded 1,459 requests by second 20 — no further growth at all.

Also applied, per the user's related request, a conservative compression tightening for future uploads: `MAX_DIMENSION` in `app/api/upload/route.ts` trimmed 1600px → 1280px (still ~4x the pixels the PDF's own photo box needs at full render scale). `JPEG_QUALITY` left untouched — that's the knob that actually affects visible sharpness, already deliberately tuned once before after a real blur complaint. Only affects new uploads, not the 170 photos already in Blob storage.

**Files:** `components/katalog/KatalogClient.tsx` (grid unmounts during download), `app/api/upload/route.ts` (MAX_DIMENSION 1600→1280).
**Regression test:** Clean build. Re-ran the Playwright network capture before/after — confirmed the fix eliminates the repeated-fetch pattern entirely, not just theorized. Selection/PDF page-packing/output logic untouched — the grid is the only thing conditionally unmounted.

---

## BUG-008 — Beranda shows "Belum Bayar" for invoices that already have a DP

**Severity:** B2
**Status:** FIXED (2026-08-31)
**Source:** User report ("Di Beranda, jika sudah DP, berikan status DP nya jangan belum bayar").

**Description:** `Invoice.status` only ever holds `"draft" | "unpaid" | "paid"` — recording a DP (see `app/invoice/[id]/dp/page.tsx`) intentionally leaves status at `"unpaid"` (only the remaining balance changes, per `DpForm.tsx`'s own note "DP bukan pelunasan"). `FollowUpStatusBadge` and every follow-up list read that raw status directly, so an invoice that already had a DP recorded still showed the same "Belum Bayar" badge as one with nothing paid at all — on Beranda's desktop and mobile-sales "Perlu ditindak" lists, and (found while fixing it) the same gap on `/follow-up`'s desktop table and mobile card list, since all four share the exact same `FollowUpStatusBadge` component and `getFollowUpInvoices()` data source.

**Root cause:** No DP-aware state anywhere in the follow-up data/UI layer — only the raw status enum.

**Fix:** `FollowUpInvoiceRow` (`lib/dashboard.ts`) gained `hasDp: boolean` (`!!inv.dp?.nominal`, same check `lib/katalog.ts` already uses for Katalog's own "Sudah DP" badge). `FollowUpStatusBadge` gained a `"dp"` variant ("Sudah DP", same blue already used for this exact state on Katalog's product cards). Every call site that renders the badge from a `FollowUpInvoiceRow` now passes `"dp"` when `hasDp` is true instead of the raw status — Beranda desktop (both the generic and sales-personalized lists), Beranda mobile sales row title, `/follow-up`'s table, and its mobile card list.

**Files:** `lib/dashboard.ts`, `components/dashboard/FollowUpStatusBadge.tsx`, `components/dashboard/MobileFollowUp.tsx`, `app/page.tsx`, `app/follow-up/page.tsx`.
**Regression test:** Clean build. Aggregate counts (`unpaidCount`, `belumTertagih`, draft/unpaid filters) deliberately left untouched — a DP'd invoice still genuinely has money owed, so it correctly stays counted there; only the per-invoice badge/label changed.

---

## BUG-009 — Katalog search can't match a full "80 x 60 x 100" size query

**Severity:** B3
**Status:** FIXED (2026-09-02)
**Source:** User report ("di katalog bisa search juga by ukuran 80 x 60 x 100, kemarin ini sudah bisa tapi sekarang tidak bisa").

**Description:** Checked git history (`ead1934`, 2026-08-26) — the search box and the sidebar's manual Ukuran field have only ever matched a *single* number against one P/L/T dimension at a time (e.g. "80" matches any side that's exactly 80cm); a combined query like "80 x 60 x 100" was never implemented, so this wasn't a regression, but the gap matched what the user asked for closely enough to fix as reported.

**Root cause:** N/A (missing capability, not a broken one) — `asNumber = /^\d+(\.\d+)?$/.test(q)` only ever recognized a query that was purely one number.

**Fix:** Added `parseSizeQuery()`/`matchesSizeQuery()` to `KatalogClient.tsx` — a query is treated as a size query when, split on `x`/`×`/`,`/`-`/whitespace, every token is a plain number; every number the user types must match one of panjang/lebar/tinggi (partial: fewer than 3 numbers is fine, per the user's explicit choice), unordered. Single-number queries behave exactly as before. Applied to both the main search box (still OR'd with name/SKU text search) and the sidebar's Ukuran field (unchanged: size-only, no text fallback). Sidebar placeholder updated to "Contoh: 80 x 60 x 100 (cm, P/L/T)".

**Files:** `components/katalog/KatalogClient.tsx`, `components/katalog/KatalogFilterSidebar.tsx`.
**Regression test:** Clean build; lint diff shows only the pre-existing `react-hooks/set-state-in-effect` in the same file. Manually reasoned through: "80" alone still exact-matches a single dimension (unchanged); "80 x 60 x 100" now requires all three to be present among P/L/T; "80 x 999" now correctly excludes a product that doesn't have a 999cm side.

---

## BUG-010 — Product names show a stray "-" from TASK-005's Merk-in-name feature

**Severity:** B3
**Status:** FIXED (2026-09-03)
**Source:** User report ("untuk merk, jika '-' kenapa muncul? bukanya kemaren sudah di fix?").

**Description:** `productDisplayName()` (TASK-005) correctly skips a genuinely empty/blank Merk, but queried the real database and found 135 of 225 products have `merk` stored as the literal string `"-"` — a pre-existing data-entry convention (staff typing "-" to mean "no brand") that predates this feature entirely. Since `"-".trim()` is truthy, the function treated it as a real brand and appended it, producing names like "Working Table -".

**Root cause:** Data, not logic — the function's empty check never accounted for this placeholder convention because it wasn't known about until checked directly against production data.

**Fix:** `productDisplayName()` in `lib/format.ts` now also treats `"-"` and `"—"` the same as empty — no DB migration; the existing 135 products (and any future one someone fills the same way) are corrected everywhere the function is already used (Katalog card, PDF, Invoice picker + snapshot).

**Files:** `lib/format.ts`.
**Regression test:** Clean build, lint clean. Verified directly against production data via a read-only query (135 products with `merk: "-"`, 0 with `merk: ""`) before and reasoning through after.

---

## BUG-011 — Katalog search never matched Merk (active products "disappear" when searching a brand)

**Severity:** B2
**Status:** FIXED (2026-09-04)
**Source:** User report ("Di katalog, eror jika search by merk... barang aktifnya tidak muncul").

**Description:** TASK-005 (2026-09-02) made Merk a real, separately-typed field shown alongside the product name — but the actual search predicates were never updated to match it. Typing a brand (e.g. "Hosizaki") into Katalog's search box, or the Invoice "Tambah Produk" sidebar's own search, matched nothing at all, even for active products genuinely carrying that Merk — both filters only ever checked `name`/`sku` (+ size, for Katalog). The DB-backed searches (`/api/products`'s `search` param, Inventory's list) already included `merk` in their `$or` — only these two purely client-side JS filters had the gap.

**Root cause:** TASK-005 changed what's *displayed* (name + merk) without auditing every place a product is *searched*, and both gaps are hand-written JS predicates independent of the server-side `$regex` filters that already got it right.

**Fix:** Added `p.merk.toLowerCase().includes(q)` (guarded for `undefined`) to both filters — OR'd in alongside the existing name/SKU checks, same pattern as the DB-side searches.

**Files:** `components/katalog/KatalogClient.tsx`, `components/invoice/AddProductSidebar.tsx`.
**Regression test:** Clean build, lint clean.
