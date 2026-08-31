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
**Status:** BLOCKED — REQUIRES DECISION (paused as part of TASK-003, not urgent enough to jump the queue per the user's own sequencing choice)
**Source:** Discovered while designing TASK-003 (Bulk Diskon)'s algorithm.

**Description:** `lib/services/createInvoice.ts`/`updateInvoice.ts` clamp diskon for barang Bekas via `maxDiskonBekas()`, but Barang Baru/Custom has no equivalent clamp at all. Since `computeLineCommission` for Baru/Custom is `round((hargaJual - diskon) * 0.06)`, a raw API request (bypassing the client's own guards) with `diskon > hargaJual` would compute a NEGATIVE commission.

**Why not auto-fixed immediately:** The user already confirmed the fix ("Ya, sekalian tambahkan proteksi" during TASK-003 planning) but explicitly deferred ALL of TASK-003's execution, including this. Not auto-fixed ahead of that instruction even though it qualifies as "safe" under the auto-fix rules, out of respect for the explicit pause.

**Recommended fix (already designed, see [[hojay-bulk-diskon-plan]] in memory):** clamp `diskon ≤ hargaJual` for Baru/Custom in both services, mirroring the existing Bekas protection.

**Files:** `lib/services/createInvoice.ts`, `lib/services/updateInvoice.ts`.

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

## BUG-007 — Katalog PDF generation slow for larger selections

**Severity:** B2
**Status:** FIXED (2026-08-31)
**Source:** User report ("lama sekali untuk proses pembuatan katalog untuk bisa di download pdf").

**Description:** `KatalogClient.tsx`'s download handler captured each PDF page with `html2canvas` one at a time in a sequential `for` loop, fully awaiting one page's capture (image decode + paint at `KATALOG_PDF_RENDER_SCALE`) before even starting the next — for a catalog with many pages, that serialization compounds directly into wait time.

**Root cause:** Page captures were unnecessarily serialized; nothing about the work itself requires one page to finish before the next starts (each page is already its own independent, fixed-size capture — see `CatalogPrintDoc.tsx`'s "Per-page capture" doc comment).

**Fix:** Changed the sequential loop to `Promise.all` — every page's `html2canvas` call is kicked off together, letting the browser interleave the work, then the resulting canvases are assembled into the PDF in order afterward. `KATALOG_PDF_RENDER_SCALE`/`KATALOG_PDF_JPEG_QUALITY` (the two knobs that actually affect visual quality, already deliberately tuned up once before after a blur complaint — see the comments in `CatalogPrintDoc.tsx`) were not touched, so this is a scheduling change only, no quality trade-off.

**Files:** `components/katalog/KatalogClient.tsx`.
**Regression test:** Clean build. No change to per-page output, only capture order/concurrency.
