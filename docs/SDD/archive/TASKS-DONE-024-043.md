# HOJAY — Task Archive (DONE)

> Dipindah dari TASKS.md. Isi tidak diubah.

---

## TASK-024 — Inventory: "% Komisi" column on Semua Produk + Riwayat Stok

**Type:** Feature
**Priority:** P2
**Status:** DONE (2026-09-19)
**Dependency:** None
**Created:** 2026-09-19 · **Last updated:** 2026-09-19

**Description:** Triggered by a real support question the same day ("di invoice bu erlin, kenapa komisinya 300.000") that took a manual DB query to answer — the commission % a product actually earns was invisible anywhere in the UI, only derivable by reading `lib/commission.ts`'s resolution order (flat 6% for barang baru; for bekas: product-level `komisiBekasPercent` override → category-level override → global 10% default). The user asked to surface it directly on Inventory's two tables, previewed as an HTML mockup first ("kita buat plan dulu ya" → "perlihatkan htmlnya" → "Okee deploy").

**Fix:** New `getEffectiveKomisiInfo()` in `lib/commission.ts` — same resolution order as the existing `resolveKomisiBekasPercent()`, but also tags which rule won (`flat-baru` / `override-produk` / `default-kategori` / `default-global`) via a new `KomisiInfo` type, plus a `KOMISI_SOURCE_LABEL` map for the Indonesian sub-label. Both `app/produk/(list)/page.tsx` (Semua Produk) and `app/produk/(list)/riwayat/page.tsx` (Riwayat Stok, already doing a live Product lookup for TASK-023's Baru/Bekas badge — extended to also select `komisiBekasPercent`/`category`) now render a highlighted "% Komisi" column: the resolved percent plus a small muted sub-label explaining why (e.g. "override produk"), reusing `getKategoriKomisiBekasMap()` (`lib/katalog.ts`) for the category-level lookup, same helper Katalog already uses. `MobileProdukList.tsx`'s card got a compact "Komisi N%" text (no sub-label, space-constrained) alongside its existing Stok/Umur Stok line.

Deliberately **live, not a historical snapshot** — Riwayat Stok's % reflects the product's CURRENT commission settings, which may differ from what actually applied at the time of an old movement if the product/category rate changed since (explicitly disclosed to the user in the mockup and accepted). Visibility is not Owner-restricted — only *editing* the override is Owner-only (`isKomisiSettingAllowed`, TASK-015); viewing the resolved rate is no more sensitive than the commission Rupiah amount already shown on the Invoice list to anyone who can see it.

**Files affected:** `lib/commission.ts` (`getEffectiveKomisiInfo`, `KomisiInfo`, `KOMISI_SOURCE_LABEL`), `app/produk/(list)/page.tsx`, `app/produk/(list)/riwayat/page.tsx`, `components/produk/MobileProdukList.tsx`.

**Regression test:** Clean `tsc --noEmit`, clean `eslint`, clean `next build`. No live browser click-through (no test credentials in this environment) — recommended before treating as fully verified, same caveat as TASK-023.

**Mobile:** `MobileProdukList.tsx` card updated (compact "Komisi N%" line); Riwayat Stok's mobile behavior unchanged from TASK-023 (`TableScroll` horizontal-scroll fallback, no dedicated mobile card list exists for that table) — not verified live on an actual small viewport.

---

## TASK-025 — Pelanggan optional fields, Invoice Provinsi/Kota unlocked, Katalog edit-drawer stale-cache fix

**Type:** Bug fix / Feature
**Priority:** P2
**Status:** DONE (2026-09-19)
**Dependency:** None
**Created:** 2026-09-19 · **Last updated:** 2026-09-19

**Description:** Three independent asks from the same session, previewed as a plan (not a visual mockup — no UI shape changed) before coding: "Nama Toko Usaha dan Jenis Usaha Optional bukan wajib ya" + "di Invoice Provinsi dan Kota / Kabupaten bisa di ganti ya jangan di lock" + "di katalog, setelah di edit menggunakan pensil, secara otomatis di katalog harus berubah harganya, karena saat ini harus di refresh dulu".

**1. Customer `namaToko`/`jenisUsaha` → optional.** Was `required: true` in `models/Customer.ts` since these fields were added, enforced with a `required` attribute on both `CustomerForm.tsx` (standalone /pelanggan flow) and `InlineCustomerForm.tsx` (inline during invoice creation). Both dropped to plain optional fields, labels updated to say "(opsional)". "Sebutkan Jenis Usaha" (the free-text sub-field shown only when "Lainnya" is picked) stays conditionally required — unrelated to this change, that logic was already correct.

**2. Invoice Provinsi/Kota → editable, not locked to the customer.** These were `disabled` inputs auto-filled from the selected customer and, on inspection, **never actually saved anywhere** (not on the Invoice model, not used for any ongkir calculation — purely a read-only display). Explicitly locked per the user's own 2026-08-25 request, now reversed. Since an editable-but-discarded field would be pointless, added real `provinsi`/`kota` fields to `models/Invoice.ts` (optional, same pattern as the existing `shipAddress`) — pre-filled from the selected customer on pick but independently editable and saved from here on. Threaded through `CreateInvoiceInput`/`createInvoice.ts`/`updateInvoice.ts` (API routes needed no changes — they already forward the whole typed body). `app/invoice/[id]/ubah/page.tsx` falls back to the customer's own provinsi/kota for an invoice saved before this field existed.

**3. Katalog: price not updating after pencil-icon edit without a manual refresh — real bug, root-caused.** `KatalogClient.tsx` (TASK-012's server-paginated infinite scroll) keeps its grid in client-side state (`items`), seeded once from `initialProducts` on mount and never resynced. `EditProductDrawer.tsx`'s old `handleSaved()` only called `router.refresh()`, which re-renders the *server* component (`app/katalog/page.tsx`) with fresh data — but that just hands `KatalogClient` a new `initialProducts` prop it was never watching, so the edited fields stayed stale until a full page reload remounted the component fresh. Fix: new `getKatalogProductById()` (`lib/katalog.ts`, reuses the exact same `toKatalogProduct()` shaping the grid itself uses) + `GET /api/katalog?id=...` branch; `EditProductDrawer` fetches the freshly-shaped product after a successful save and calls a new `onSaved` callback; `KatalogClient` patches that one card in `items` directly by id — no full refetch, doesn't disturb whatever's already been scroll-loaded beyond page 1. `router.refresh()` kept alongside it (covers a later full navigation/reload).

**Files affected:** `models/Customer.ts`, `components/pelanggan/CustomerForm.tsx`, `components/invoice/InlineCustomerForm.tsx`, `app/pelanggan/[id]/edit/page.tsx` (type fix — `namaToko`/`jenisUsaha` now possibly `null` from the DB), `models/Invoice.ts`, `components/invoice/InvoiceForm.tsx`, `lib/services/createInvoice.ts`, `lib/services/updateInvoice.ts`, `app/invoice/[id]/ubah/page.tsx`, `lib/katalog.ts`, `app/api/katalog/route.ts`, `components/katalog/EditProductDrawer.tsx`, `components/katalog/KatalogClient.tsx`.

**Regression test:** Clean `tsc --noEmit` (one pre-existing type error fixed as a side effect of making `namaToko`/`jenisUsaha` optional), clean `eslint` on every changed file (two `react-hooks/set-state-in-effect` errors surfaced in `InvoiceForm.tsx` during lint — confirmed via `git stash` to be pre-existing on unrelated lines, not introduced by this change, left as-is/out of scope), clean `next build`. No live browser click-through — recommended before treating as fully verified, same caveat as TASK-023/024.

**Mobile:** No new UI surfaces added (Provinsi/Kota were already in the existing invoice form grid, Nama Toko/Jenis Usaha labels unchanged in layout) — existing responsive behavior untouched.

---

## TASK-026 — Invoice Catatan field (+ PDF), Beranda "Perlu Dikirim" reframe, Tanggal Pengiriman no longer defaults

**Type:** Feature
**Priority:** P2
**Status:** DONE (2026-09-19)
**Dependency:** None
**Created:** 2026-09-19 · **Last updated:** 2026-09-19

**Description:** Three more asks from the same long session. The Beranda reframe was previewed as an HTML mockup (before/after comparison) before coding, per the user's explicit request; the Catatan field got a written plan (no visual mockup needed — no new UI shape, just a field). Confirmed to proceed with "oke proses" + "diterapkan di keduanya" (both Invoice/Surat Jalan for Catatan, and both mobile/desktop + admin/sales for the Beranda reframe).

**1. Invoice "Catatan" field, shown on Invoice/Bukti Transfer AND Surat Jalan.** New top-level `catatan` field on `models/Invoice.ts` (distinct from the existing `dp.catatan`/`payment.catatan`, which are specific to one payment event, not a general note) — free-text `Textarea` in `InvoiceForm.tsx`, threaded through `CreateInvoiceInput`/`createInvoice.ts`/`updateInvoice.ts`, added to the shared `InvoicePrintData` type (`lib/invoiceDisplay.ts`) and rendered identically in both print/preview components (`InvoicePrintDoc.tsx` for the actual PDF capture, `InvoiceDocument.tsx` for the on-screen preview/Preview-drawer view) — same insertion point in both (between the totals block and the Payment Details/closing-logo row), shown for every mode including `surat-jalan`. Absent entirely (no empty box) when blank.

**2. Beranda "Perlu Ditindak" → "Perlu Dikirim".** Was sorted/labeled by how long an invoice had been unpaid (days since created, sisa tagihan shown); `Invoice.tanggalKirim` existed on the schema but was never surfaced anywhere on Beranda. New shared `shippingUrgency()` helper (`lib/dashboard.ts`) buckets every draft/unpaid invoice into Terlambat N hari (overdue, red) / Kirim Hari Ini / Besok / Kirim {date} / Belum Dijadwalkan (no `tanggalKirim` set — sorts last), applied consistently across all four Beranda render paths so they can't drift: desktop admin card (title renamed "Perlu Dikirim", `needsAction` now sorted by shipping urgency instead of a `followUpAll` slice), desktop Sales card ("Dikejar hari ini", `myUnpaid` re-sorted + subtitle relabeled), mobile admin aggregate row (title "N invoice perlu dikirim", customer names in the subtitle now the two most shipping-urgent instead of arbitrary order, its red-border `urgent` flag now reflects actual overdue/today shipping status instead of always true), mobile Sales rows (same relabel + urgency-based `urgent` flag). `getFollowUpInvoices()`'s own return order is left untouched (still createdAt-ascending) since it also powers `/follow-up`, which wasn't in scope — the re-sort happens only in `app/page.tsx` on a local copy. **Deliberately scoped out:** a new "Tandai Kirim" (mark-as-shipped) action floated in the mockup — there's no shipped/not-shipped status separate from payment status anywhere in the data model today, and adding one is a real feature, not a relabel; existing "Lihat"/"Lanjutkan" actions kept as-is. Flagged to the user as an open question, not silently dropped.

**3. Invoice's "Tanggal Pengiriman" no longer defaults to H+3.** Reverses the 2026-08-25 default (`defaultTanggalKirim()`, now deleted) — the field starts empty on a new invoice, per the user's explicit request 2026-09-19 ("jangan lagi dibuat default").

**Files affected:** `models/Invoice.ts`, `lib/invoiceDisplay.ts`, `lib/services/createInvoice.ts`, `lib/services/updateInvoice.ts`, `components/invoice/InvoiceForm.tsx`, `components/invoice/InvoicePrintDoc.tsx`, `components/invoice/InvoiceDocument.tsx`, `app/invoice/page.tsx`, `app/invoice/[id]/page.tsx`, `app/invoice/[id]/ubah/page.tsx`, `lib/dashboard.ts`, `app/page.tsx`.

**Regression test:** Clean `tsc --noEmit`, clean `eslint` on every changed file (one new `react-hooks/purity` error surfaced in `app/page.tsx` — confirmed via `git stash` to be pre-existing on an unrelated line, `Date.now()` in `recentActivityCount`, not introduced by this change), clean `next build`. No live browser click-through — recommended before treating as fully verified, same caveat as every task earlier this session.

**Mobile:** All 4 Beranda urgency rows (2 mobile, 2 desktop) updated together, not just desktop — per the user's explicit "diterapkan di keduanya" confirmation. Not verified live on an actual small viewport.

**Follow-up (2026-09-19, same day):** Two quick corrections right after shipping. (1) "kamu tampilkan juga tanggal kirimnya ya" — `shippingUrgency()`'s label now always includes the actual date alongside the relative wording (e.g. "Terlambat 2 hari (17 Sep)", "Kirim Hari Ini (19 Sep)", "Besok (20 Sep)"), not just the relative label on its own; since all 4 surfaces already call this one shared helper, this fixed all of them at once. (2) "tidak perlu ada stok menipis" — removed the desktop admin "Perlu Dikirim" card's "Stok tipis" row entirely (it didn't fit the shipping-only reframe); `getLowStockProducts()` call and its `lowStock` variable removed from `app/page.tsx` as dead weight along with it (the function itself is left in `lib/dashboard.ts`, unused for now but not deleted). `needsAction`/`totalNeedsAction` simplified back to a flat count now that nothing else shares that row budget.

**Follow-up 2 (2026-09-19, same day) — payment-tier priority added:** "utamakan yang sudah lunas dulu setelah itu yang sudah DP." Real gap surfaced during this: `getFollowUpInvoices()` (the widget's original source) only ever queries `status: {$in: ["unpaid","draft"]}` — a fully-**paid** invoice drops out of it entirely, so there was nothing to prioritize by "Lunas" in the first place. Clarified with the user via two follow-up questions before building: (1) confirmed this ordering is specific to the "Perlu Dikirim" widget, not a default Invoice-list sort; (2) confirmed HOW to safely reintroduce paid invoices, since this app has no separate "sudah dikirim" flag — a paid invoice could theoretically be genuinely old-and-already-shipped, and including every paid invoice forever would flood the widget with stale, already-completed orders. Landed on: include a paid invoice only while its `tanggalKirim` still looks shipping-relevant (unset, due today/soon, or overdue by at most `SHIPPING_PAID_LOOKBACK_DAYS` = 14 days) — beyond that window it's assumed already shipped and left out.

New `getShippingPriorityInvoices()` (`lib/dashboard.ts`) — merges `getFollowUpInvoices()`'s draft/unpaid rows with a separate bounded query for shipping-relevant paid invoices, into one `ShippingRow[]` sorted by payment tier (Lunas=0, Sudah DP=1, Belum Bayar/Draft=2) then `shippingUrgency` within each tier. New `FollowUpStatusBadge` "paid" → "Lunas" (emerald, matching `Pill.tsx`'s existing "paid" color). Wired into all 4 Beranda surfaces: desktop admin (`needsAction`/`totalNeedsAction` now read straight off the already-sorted `shippingRows`), desktop+mobile Sales (new `myShipping` — `shippingRows` filtered to the session's own `salesNama`, excluding draft since `myDraft` already renders those separately with their own "Lanjutkan" action — replaces `myUnpaid` in `salesNeedsAction`/`salesUrgentRows` specifically; the plain unpaid-only `myUnpaid` is kept untouched for the unrelated commission/"Order jalan" stat cards further down the page), mobile admin (`genericUrgentRows`' "invoice" row now sourced from `shippingNonDraft`, count/subtitle/nilai all recomputed from it instead of `unpaidCount`/`belumTertagih`).

**Files (this follow-up):** `lib/dashboard.ts` (`ShippingRow`, `getShippingPriorityInvoices`, `shippingPaymentTier`), `components/dashboard/FollowUpStatusBadge.tsx` ("paid" variant), `app/page.tsx`.

**Follow-up 3 (2026-09-19, same day) — "lihat semua" now actually shows the full shipping list.** Reported with a screenshot of the live widget: clicking "lihat semua" landed on `/follow-up`, which still showed the OLD payment-follow-up view (unpaid/draft only, "Berjalan X hari" column, no shipping labels at all) — the widget itself had been reframed but its own "see everything" link never followed. Couldn't just repoint `/follow-up` wholesale to the new shipping framing, though: Komisi Saya's "Tagih yang tertahan" button also links there, and that copy is genuinely about payment collection (unpaid-only) — showing it a list that includes already-**paid** invoices would make the button's own wording wrong. Added a `?view=kirim` branch on the SAME `/follow-up` page instead of a new route: default (no param, or reached from Komisi Saya) keeps the exact original "Follow-up Penjualan" behavior untouched; `?view=kirim` (new `PerluDikirimView` in the same file) renders the full `getShippingPriorityInvoices()` list — same Lunas→DP→Belum Bayar tiering as the widget, every row showing its `shippingUrgency` label (Besok/Terlambat N hari/Hari Ini, colored red for overdue and accent for today), stat cards for total/terlambat/hari-ini/lunas counts. New `components/dashboard/MobileShippingRows.tsx` (mirrors `MobileFollowUp.tsx`'s `MobileFollowUpRows` but for `ShippingRow`, which can be "paid"). Both of Beranda's "lihat semua"-equivalent links (desktop admin card's text link, mobile aggregate row's tap-through) now point at `?view=kirim`.

**Files (follow-up 3):** `app/follow-up/page.tsx` (`PerluDikirimView`), `components/dashboard/MobileShippingRows.tsx` (new), `app/page.tsx`.

**Follow-up 4 (2026-09-19, same day) — real "Tandai Sudah Kirim" trigger.** The 14-day paid-invoice lookback (follow-up 2) was always a stopgap — screenshot from the live widget showed 37 old paid invoices flooding "Perlu Dikirim" (many probably already shipped weeks ago), confirming the guess-based window wasn't enough on its own. Planned via a written Requirement/Impact/Files/Plan (flagged as a real schema change, "perubahan besar") plus an HTML mockup showing the button in its 3 placements, both confirmed before coding.

New Invoice fields: `dikirim` (Boolean), `tanggalDikirimAktual` (Date), `dikirimOleh` (String) — settable at any payment status except draft (shipping can happen before full payment, e.g. once DP'd). New `PATCH /api/invoices/[id]/kirim` (toggles via `{dikirim: true|false}` in the body, guards against draft). New shared client component `components/invoice/TandaiKirimButton.tsx` (confirm dialog → PATCH → `router.refresh()`), wired into: Invoice list (`InvoiceListClient.tsx`, next to the existing "Tandai Lunas"), `/follow-up` default view, `/follow-up?view=kirim`, and the invoice detail page (`app/invoice/[id]/page.tsx`, new "Status Pengiriman" panel mirroring the existing "Status Pembayaran" one). A "✓ Sudah Dikirim / ✓ Dikirim" badge shows wherever a row could still be `dikirim: true` (Invoice list, `/follow-up` default view including its mobile cards) — not needed on `/follow-up?view=kirim` or Beranda's widget since `getShippingPriorityInvoices` now excludes `dikirim: true` rows entirely, so every row shown there is by definition unshipped.

The 14-day lookback window (follow-up 2) is kept, not replaced — `getShippingPriorityInvoices`'s paid-invoice query now filters `dikirim: {$ne: true}` AND the existing date-relevance `$or`. This was a deliberate two-signal design confirmed with the user: the lookback lets the historical backlog age out on its own (no risky bulk migration guessing which old paid invoices were already shipped), while the new button lets anyone dismiss a row immediately without waiting. `getFollowUpInvoices()` itself is untouched — payment follow-up still applies regardless of shipped status (a shipped-but-unpaid invoice still needs collecting), so `getShippingPriorityInvoices` filters its own merged copy (`shippableFollowUp`) rather than the shared source. Per the user's explicit decision from the plan: no button added to the Beranda widget itself (space-constrained, "Lihat" stays as the only action there) — the 3 dedicated pages carry the real trigger.

**Files (follow-up 4):** `models/Invoice.ts`, `app/api/invoices/[id]/kirim/route.ts` (new), `lib/dashboard.ts` (`FollowUpInvoiceRow`/`ShippingRow` gain `dikirim`/`tanggalDikirimAktual`/`dikirimOleh`; `getShippingPriorityInvoices`'s filter), `components/invoice/TandaiKirimButton.tsx` (new), `components/invoice/InvoiceListClient.tsx`, `app/invoice/page.tsx`, `app/invoice/[id]/page.tsx`, `app/follow-up/page.tsx`, `components/dashboard/MobileFollowUp.tsx`.

**Regression test:** Clean `tsc --noEmit` (one transient error from the new typed API route not yet in the generated route manifest — resolved itself after `next build` regenerated it, unrelated to the code), clean `eslint` on every changed file, clean `next build`. No live browser click-through — recommended before treating as fully verified, same caveat as every task this session.

---

## TASK-027 — Pelanggan: filter on both table surfaces

**Type:** Feature
**Priority:** P2
**Status:** DONE (2026-09-19)
**Dependency:** None
**Created:** 2026-09-19 · **Last updated:** 2026-09-19

**Description:** "di bagian pelanggan, tampilkan filter di setiap header tablenya" — planned first (Requirement/Impact/Files, confirmed via AskUserQuestion on exactly which filters per table, no HTML mockup needed since neither change altered the page's visual shape), then built.

**1. `/pelanggan` "Semua Pelanggan"** — added a `SearchInput` (nama/kode, case-insensitive `includes`) and a Kota dropdown (new `components/pelanggan/PelangganKotaFilter.tsx`, same navigate-by-URL-param client pattern as `InvoicePeriodFilter.tsx`; options sourced from `summary.kotaTerbesar`, already computed for the sidebar — no new query). Filtered in-memory alongside the existing Semua/Ada Piutang pill toggle (`getPelangganSummary`'s own doc comment already justifies this: customer count small enough that a full scan per load is cheap). Fixed a latent message bug while touching this: the "Belum ada pelanggan... Tambah pelanggan pertama" empty state used to key off `filter === "semua"` alone, so an empty *search* result on the default pill would have wrongly shown the "add your first customer" nudge even with customers in the account — now keyed off `summary.rows.length === 0` (true empty account) instead.

**2. `/pelanggan/[id]` "Semua Invoice Pelanggan Ini"** — added a status pill filter (Semua/Draft/Belum Bayar/Lunas), same visual pattern as the Semua/Ada Piutang pill on the list page. Filtered in-memory from the already-fetched, already-sorted invoice list (`allInvoices` → `invoices`); `totalBelanja` (page subtitle) stays computed from the unfiltered `allInvoices` since it's meant to reflect the whole customer relationship, not just the current filter view. `SortableHeader`'s existing param-preservation (confirmed by reading its source) meant sort clicks keep the active status filter for free; a small `buildStatusHref()` helper does the reverse (status pill clicks preserve sort/dir).

**Files affected:** `app/pelanggan/page.tsx`, `components/pelanggan/PelangganKotaFilter.tsx` (new), `app/pelanggan/[id]/page.tsx`.

**Regression test:** Clean `tsc --noEmit`, clean `eslint`, clean `next build`. No live browser click-through — recommended before treating as fully verified.

**Follow-up (2026-09-19, same day) — "Tandai Sudah Kirim" became a modal form.** The single-click confirm() version (TASK-026 follow-up 4) didn't match the HTML mockup the user had approved — reported with a screenshot of the live (still confirm()-based) button. Rebuilt `TandaiKirimButton.tsx` as a self-contained modal: **Tanggal Dikirim** (date input, defaults to today) and **Kurir** (`<Select>`, defaults to the invoice's current `kurir`, Simpan disabled until one is picked). Submitting posts `{dikirim: true, tanggalDikirimAktual, kurir}` to `/api/invoices/[id]/kirim`, which now accepts both — a `kurir` that differs from what's stored REPLACES `Invoice.kurir` itself (not a separate field), so the next PDF/preview render picks it up automatically since `InvoicePrintDoc.tsx`/`InvoiceDocument.tsx` already read `invoice.kurir` live — no PDF code touched.

Every one of the 4 call sites now needs a Courier list + the invoice's current `kurir` to hand the modal: `FollowUpInvoiceRow`/`ShippingRow` gained a `kurir` field (`lib/dashboard.ts`), and `app/invoice/page.tsx`, `app/follow-up/page.tsx` (both views, via a small local `getCouriers()` helper), and `app/invoice/[id]/page.tsx` each now fetch `Courier.find()` and pass it through (`InvoiceListClient.tsx` too, as a new required prop).

**Files (this follow-up):** `components/invoice/TandaiKirimButton.tsx` (rewritten — modal, `CourierOption` type exported), `app/api/invoices/[id]/kirim/route.ts` (accepts `tanggalDikirimAktual`/`kurir`), `lib/dashboard.ts` (`kurir` field), `app/invoice/page.tsx`, `components/invoice/InvoiceListClient.tsx`, `app/follow-up/page.tsx`, `app/invoice/[id]/page.tsx`.

**Regression test:** Clean `tsc --noEmit`, clean `eslint` on every changed file, clean `next build`. No live browser click-through — recommended before treating as fully verified.

**Follow-up 2 (2026-09-19, same day) — two more real bugs found from screenshots.** (1) "di dashboard, kenapa ga ada tandai sudah dikirim?" — the button was deliberately left off Beranda's widget per the plan's own proposal ("ruang sempit"), which was never actually confirmed either way before building. Added it to the desktop admin "Perlu Dikirim" card's rows (next to "Lihat"/"Lanjutkan"), fetching the Courier list alongside the widget's other data. **Not yet added to the Sales "Dikejar hari ini" card** — its `salesNeedsAction` array mixes invoice rows with dormant-customer rows in one loosely-typed shape (`badgeStatus`/`title`/`subtitle`/`actionLabel`/`actionHref`) that doesn't carry `invoiceId`/`kurir`, so wiring it in cleanly needs a small restructure, deferred. (2) "di status Belum Bayar masih eror" — a real, unrelated pre-existing bug the screenshot incidentally exposed: `FollowUpStatusBadge.tsx`'s badge had no `whitespace-nowrap`, so "Belum Bayar" wrapped onto two lines ("BELUM"/"BAYAR" stacked) in a narrow table column. One-line fix.

**Files (follow-up 2):** `app/page.tsx`, `components/dashboard/FollowUpStatusBadge.tsx`.

---

## TASK-028 — Sortable column headers: Pelanggan + Inventory

**Type:** Feature
**Priority:** P2
**Status:** DONE (2026-09-19)
**Dependency:** None
**Created:** 2026-09-19 · **Last updated:** 2026-09-19

**Description:** "sepertinya untuk di pelanggan, kamu harus berikan button untuk sort, di setiap header tablenya, begitu juga di inventory."

**1. `/pelanggan` "Semua Pelanggan"** — had NO sort at all (a plain div-grid header, not a real `<table>`, so `components/ui/SortableHeader.tsx` — which renders a real `<th>` — couldn't be reused directly). New local `SortCol` component in `app/pelanggan/page.tsx` replicates its exact behavior (toggle asc/desc, preserve every other query param) as a plain `Link`/`span` pair instead. Sortable on Kode, Pelanggan (nama), Frekuensi (orderCount), Nilai belanja, Piutang — applied in-memory via the existing `sortRows()` helper (`lib/sort.ts`) on top of the already-filtered rows (TASK-027's search/kota/piutang filter). No explicit `sort` param keeps `getPelangganSummary()`'s own default order (nilaiBelanja desc) rather than snapping to `parseSort`'s normal "asc" fallback, which would have visibly reversed the page's existing default ordering on first load.

**2. `/produk` "Semua Produk" + `/produk/riwayat` "Riwayat Stok"** — both already had `SortableHeader` on every real field; the one gap in each was the "% Komisi" column added by TASK-024, left explicitly non-sortable at the time ("Not sortable — derived from Product, not a real...field"). Both now sort on it too. Since the effective percent is resolved per row (kondisi + product/category override, via `getEffectiveKomisiInfo`) rather than stored as a raw field, it can't go through `mongoSort()` like the others — when `sort=komisiPercent`, the query instead falls back to its normal default order (`name asc` / `tanggal desc`), and the already-fetched rows are sorted in-memory afterward using a percent computed once per row and cached in a `Map` (also reused to de-duplicate the existing double `getEffectiveKomisiInfo` call on `/produk` — was computed once for `MobileProdukList`'s rows and again per table cell). `/produk/riwayat`'s header row, which used to be hand-split around a bare `<th>` (`headers.slice(0,3)` + raw `<th>` + `headers.slice(3)`), collapsed back into one plain `.map()` now that every column goes through `SortableHeader`.

**Files affected:** `app/pelanggan/page.tsx` (`SortCol`, new `SORT_FIELDS`), `app/produk/(list)/page.tsx`, `app/produk/(list)/riwayat/page.tsx`.

**Regression test:** Clean `tsc --noEmit`, clean `eslint`, clean `next build`. No live browser click-through — recommended before treating as fully verified.

---

## TASK-029 — Leaderboard "Estimasi Sales", Invoice LUNAS watermark, Syarat & Ketentuan (editable)

**Type:** Feature
**Priority:** P2
**Status:** DONE (2026-09-19)
**Dependency:** None
**Created:** 2026-09-19 · **Last updated:** 2026-09-19

**Description:** Three requests, each planned first (Requirement/Impact/Files, an HTML mockup for all three, iterated on the user's live feedback — insentif dropped from the leaderboard mockup for privacy, watermark re-centered to fill the page, S&K justified with more line-height) before any code.

**1. Leaderboard "Estimasi Sales".** New `getUnpaidInvoicesForPeriod()` (`lib/insentif.ts`) — this period's DP'd or plain-unpaid invoices (status "unpaid" either way), bucketed by `tanggalInvoice` since they have no `payment.tanggalBayar` yet. `getSalesBoard()` now unions sales names from both the paid map AND this new unpaid map, so a sales with unpaid invoices but zero Lunas ones yet still gets a row (`totalPenjualan: 0`, `estimasiSales > 0`) instead of being left off the board — confirmed as the default while planning. New `SalesBoardRow.estimasiSales` shown as a small "+ Estimasi Rp X" line under the confirmed total, in both `SalesBoard.tsx` (desktop) and `MobileSalesBoard.tsx` (mobile, both the rank-#1 hero and the rest of the rows) — never factored into `teamTotal`/ranking/target-progress, which all stay Lunas-only exactly as before. **No commission (komisi) figure alongside it** — the user caught this themselves mid-build ("saya lupa itu privasi") after the first mockup draft included an "Estimasi Insentif" line; a sales rep's commission is private and shouldn't be visible to every other sales on a shared board, so that line was removed from both the mockup and the final build before it ever shipped.

**2. Invoice PDF/preview: big "LUNAS" watermark, badge removed.** The small pill badge next to the invoice number (both `InvoicePrintDoc.tsx`'s actual PDF and `InvoiceDocument.tsx`'s on-screen preview) is gone. Replaced with a large diagonal, translucent "LUNAS" (moss-deep green, -30°, 150px, 13% opacity) centered over the whole page via an `inset-0` flex overlay — not a `translate(-50%)` offset, which the user caught was clipping/off-center on first pass ("tolong center, dan 1 halaman full"). `InvoicePrintDoc.tsx` is multi-page (adaptive pagination for the actual PDF capture) — the watermark repeats on **every** page, not just the first, since a multi-page invoice can be viewed/printed from any page. `pointer-events-none` + low opacity throughout so it reads as a stamp, not an obstruction.

**3. Invoice "Syarat & Ketentuan", editable from Pengaturan.** User supplied a competitor's (PT Mastrada) quotation PDF as a structural reference — its actual terms (FOB Medan, their warehouse, their percentages) weren't usable as-is, only its shape (a numbered list near the closing signature block) carried over. New `Pengaturan.syaratKetentuan` field (`models/Pengaturan.ts`, default `DEFAULT_SYARAT_KETENTUAN` — 5 generic draft points for a kitchen-equipment business, explicitly marked in the UI as a draft to review before a real customer sees it, per the user's choice "Pakai draft standar dulu, saya edit nanti"). New `components/admin/PengaturanSyaratKetentuan.tsx` (a textarea, one point per line) added to `/admin/keuangan` alongside the existing Kas Awal form — per the user's explicit choice ("Bisa diedit dari Pengaturan") reconfirmed later in the same session ("saran saya ditambahkan ke pengaturan saja"). `app/api/pengaturan/route.ts`'s `PUT` now only touches the fields actually sent in the body, since two independent forms (Kas Awal, Syarat & Ketentuan) now share the one singleton doc and saving one must not clobber the other. Rendered as a numbered list, justified text with generous line-height, per the user's explicit styling request ("align justify supaya rapih dan diberikan jarak antar baris") — in both `InvoicePrintDoc.tsx` (inside the same measured `footerRef` block as the existing Catatan section, so its height is correctly counted toward the adaptive page-packing math) and `InvoiceDocument.tsx` (on-screen preview). Shown on both Invoice/Bukti Transfer and Surat Jalan, same as Catatan.

**Files affected:** `lib/insentif.ts` (`getUnpaidInvoicesForPeriod`, `SalesBoardRow.estimasiSales`), `components/insentif/SalesBoard.tsx`, `components/insentif/MobileSalesBoard.tsx`, `components/invoice/InvoicePrintDoc.tsx`, `components/invoice/InvoiceDocument.tsx`, `lib/invoiceDisplay.ts` (`InvoicePrintData.syaratKetentuan`), `models/Pengaturan.ts` (`syaratKetentuan`, `DEFAULT_SYARAT_KETENTUAN`), `app/api/pengaturan/route.ts`, `components/admin/PengaturanSyaratKetentuan.tsx` (new), `app/admin/keuangan/page.tsx`, `app/invoice/page.tsx`, `app/invoice/[id]/page.tsx`.

**Regression test:** Clean `tsc --noEmit`, clean `eslint` (one pre-existing unrelated warning in `MobileSalesBoard.tsx`, confirmed via `git diff` to predate this change), clean `next build`. No live browser click-through — recommended before treating as fully verified, especially the watermark's visual centering and the S&K text on an actual multi-page PDF.

---

## TASK-030 — Invoice list: simplify per-row action buttons (max 6 → max 2)

**Type:** UX/UI
**Priority:** P2
**Status:** DONE (2026-09-19)
**Dependency:** None
**Created:** 2026-09-19 · **Last updated:** 2026-09-19

**Description:** "di invoice, terlalu banyak button sampai ada 6 maximal, boleh kah kamu buat 2 button saja?" — a plain unpaid (no DP) row had up to 6: Preview, Tandai Sudah Kirim, Kirim WA, Edit, Hapus, Tandai Lunas. Planned first (written plan, then an HTML mockup showing a "Preview + primary action, rest in a '⋯' overflow menu" design, confirmed via AskUserQuestion) — then the user refined the rule further, past what the mockup showed, in two follow-up messages: "jika belum lunas dan belum dikirim, maka munculkan 2 button itu, jika sudah lunas, munculkan preview saja" + "button tandai lunas dan tandai sudah dikirim itu maksud saya". The shipped rule ended up simpler than the mockup — no "⋯" overflow menu at all:

- **Draft** — unchanged (Hapus + Lanjutkan). Not covered by the belum-lunas/sudah-dikirim framing — a draft isn't finalized yet, "Tandai Lunas" doesn't apply to it.
- **Unpaid or DP, not yet marked shipped** — exactly 2 buttons: **Tandai Lunas** + **Tandai Sudah Kirim**. No Preview here (a deliberate reading of the literal instruction, not an oversight).
- **Unpaid or DP, already marked shipped** — just **Tandai Lunas** (the one remaining action).
- **Paid** — just **Preview**.

Kirim WA, Edit, and Hapus are gone from the list entirely — not lost, all three were already reachable from the invoice detail page (`InvoiceActions.tsx`'s "Kirim ke Pelanggan (WA)", the "Ubah Invoice" link, and `DeleteInvoiceButton`, all in `app/invoice/[id]/page.tsx`), confirmed by reading that file before making the cut.

**Files affected:** `components/invoice/InvoiceListClient.tsx` (removed the unused `toWaPhone` import along with the Kirim WA link).

**Regression test:** Clean `tsc --noEmit`, clean `eslint`, clean `next build`. No live browser click-through — recommended before treating as fully verified.

**Follow-up (2026-09-20, same day) — the "dropped entirely" reading was wrong.** The user immediately corrected it: "tandai lunas dan tandai sudah dikirim itu betul, tapi mana 3 titiknya untuk button yang lain? tolong cepat perbaiki" — Kirim WA/Edit/Hapus were meant to stay reachable from the list via a "⋯" overflow menu, not be dropped to the detail page entirely. Added back: a per-row `openMenuId` state in `InvoiceListClient.tsx`, a small "⋯" icon button next to Tandai Lunas/Tandai Sudah Kirim (unpaid/DP rows only — draft and paid rows are unaffected, their button sets didn't have this problem), opening an absolutely-positioned dropdown (Kirim WA / Edit / Hapus, Hapus still gated on `sisaTagihan == null` exactly as before) with a full-screen invisible backdrop `<div>` to close on outside click. `toWaPhone` re-imported.

**Files (this follow-up):** `components/invoice/InvoiceListClient.tsx`.

---

## TASK-031 — Syarat & Ketentuan moved to its own Admin tab; per-line form; real backfill bug fixed

**Type:** Bug fix / UX
**Priority:** P2
**Status:** DONE (2026-09-20)
**Dependency:** TASK-029 (added the field originally, under Keuangan)
**Created:** 2026-09-20 · **Last updated:** 2026-09-20

**Description:** Three related requests in quick succession.

**1. Moved out of Keuangan.** "modul syarat dan ketentuan jangan taro di keuangan, taro saja di invoice" — new `/admin/invoice` tab (added to `ADMIN_TABS`, `app/admin/layout.tsx`) now hosts `PengaturanSyaratKetentuan`; `/admin/keuangan` goes back to just `PengaturanKeuangan`. Kept under the same `MANAGER_BLOCKED_ADMIN_PREFIXES` restriction it already had on Keuangan (`lib/auth/access.ts`) — not widened or narrowed without being asked.

**2. Per-line form.** "dibuat rapih, baris 1, baris 2, baris 3 dst, supaya lebih mudah dan bisa lebih rapih nanti untuk pengaplikasian ke invoicenya" — `PengaturanSyaratKetentuan.tsx` rebuilt from one freeform `<Textarea>` into a list of individual `<Input>`s, one per point, each labeled "Baris N" with its own remove (✕) button, plus "+ Tambah Baris". Still saved/loaded as the same one newline-joined string on the API/model side (`Pengaturan.syaratKetentuan` unchanged) — only this form's own presentation changed, so each editable row now maps 1:1 to the numbered point that actually prints on the invoice.

**3. Real bug: S&K wasn't appearing on the PDF at all.** "syarat dan ketentuan belum ada di pdf, kamu bohong" — investigated and confirmed a genuine bug, not a deploy-timing issue: the `Pengaturan` singleton document has existed since 2026-08-20 (Kas Awal only), predating `syaratKetentuan`'s addition in TASK-029. A Mongoose schema `default` only applies when a document is newly **created** — it never retroactively appears on a document already sitting in the database (same class of gap as `Customer.kota`/`provinsi`, see that model's own doc comment). So every read of the singleton (`app/api/pengaturan/route.ts`'s `GET`, and both `app/invoice/page.tsx`/`app/invoice/[id]/page.tsx` querying it directly) got `syaratKetentuan: undefined` — the settings form looked empty and no invoice ever printed a Syarat & Ketentuan section. Fixed at the data source with a one-off backfill (`db.collection("pengaturans").updateOne({_id:"singleton", syaratKetentuan:{$exists:false}}, {$set:{syaratKetentuan: DEFAULT_SYARAT_KETENTUAN}})`, run directly, not left as a script in the repo — same one-off-script convention as TASK-022's watermark retrofit) so every existing read path picks it up immediately, **plus** a permanent self-heal in `GET /api/pengaturan` (backfills `syaratKetentuan` on-the-fly if a fetched doc is still missing it) as a safety net against the same class of bug recurring for a future field added the same way.

**Files affected:** `app/admin/layout.tsx`, `app/admin/keuangan/page.tsx`, `app/admin/invoice/page.tsx` (new), `lib/auth/access.ts`, `components/admin/PengaturanSyaratKetentuan.tsx`, `app/api/pengaturan/route.ts`.

**Regression test:** Clean `tsc --noEmit`, clean `eslint`, clean `next build`. Backfill verified directly against the database (queried the singleton doc before and after — confirmed the field was genuinely missing, then confirmed it was set). No live browser click-through of the actual PDF output — recommended before treating as fully verified.

---

## TASK-032 — Syarat & Ketentuan could still be silently clipped from the generated PDF

**Type:** Bug fix
**Priority:** P1
**Status:** DONE (2026-09-20)
**Dependency:** TASK-031 (fixed the data-layer half of the same symptom)
**Created:** 2026-09-20 · **Last updated:** 2026-09-20

**Description:** "masih belum berimpact untuk pdf yang sudah dibuat" — after TASK-031's database backfill was deployed, S&K still didn't show up on generated invoice PDFs. Ruled out a full-document-replace bug in `PUT /api/pengaturan` first (empirically tested with a temporary script — `findByIdAndUpdate` with a plain object does a correct partial update, sibling fields untouched). The real cause: `InvoicePrintDoc.tsx` renders each PDF page as a fixed-height (`PAGE_HEIGHT_PX`) container with `overflow: hidden` (required for the per-page `html2canvas` capture this component is built around). S&K lived inside the same measured block as Total/Catatan/Payment Details/logo (`footerRef`) — if that whole block grew taller than one page's remaining space (e.g. DP + a long Catatan + several S&K lines, all stacked), the excess was silently clipped with no error, and since S&K sat last in that block it was the first thing to disappear.

**Fix:** Split S&K into its own separately-measured block (`skRef`/`skHeight`, mirroring the existing `headerRef`/`footerRef` pattern) and its own placement decision, independent of the footer's. Pass 2 pagination is now a 3-tier check: (1) footer + S&K both fit alongside the last page's item rows → same page; (2) footer fits there but S&K doesn't → footer stays, S&K gets pushed to a dedicated page; (3) footer itself needs its own page → S&K joins it there if there's room, otherwise gets a further dedicated page of its own. S&K is now never dropped, only ever pushed forward onto a later page. The LUNAS watermark (previously only on item-row pages) now also renders on the standalone footer-only page and the new standalone S&K-only page, for visual consistency on a paid invoice regardless of how many pages it spans.

**Files affected:** `components/invoice/InvoicePrintDoc.tsx`.

**Regression test:** Clean `tsc --noEmit`, clean `eslint`, clean `next build`. Not yet click-tested live against a real long invoice (long Catatan + long S&K forcing the 3rd tier) — recommended before treating as fully verified.

---

## TASK-033 — Invoice list: add Preview to the "⋯" overflow menu

**Type:** UX
**Priority:** P3
**Status:** DONE (2026-09-20)
**Dependency:** TASK-030 (added the "⋯" menu)
**Created:** 2026-09-20 · **Last updated:** 2026-09-20

**Description:** "tambahkan button preview di titik tiga" — unpaid/DP invoice rows (Tandai Lunas + Tandai Sudah Kirim + "⋯") couldn't preview without opening the detail page first, unlike paid rows which already had a dedicated Preview button. Added a "Preview" item to the top of the "⋯" menu (above Edit), reusing the same `openPreview()` handler paid rows already call — closes the menu on click.

**Files affected:** `components/invoice/InvoiceListClient.tsx`.

**Regression test:** Clean `tsc --noEmit`, clean `eslint`, clean `next build`. Not yet click-tested live.

---

## TASK-034 — Katalog ProductCard decluttered (mockup-approved)

**Type:** UX/UI
**Priority:** P2
**Status:** DONE (2026-09-30)
**Dependency:** None
**Created:** 2026-09-30 · **Last updated:** 2026-09-30

**Description:** User reported the card had "to much information" and felt cluttered/too long. Design Review done as an HTML mockup artifact (Before/After comparison, then a follow-up iteration for the price-preset switch) and approved before touching code, per the design-system framework. Changes, all presentational — no capability removed, only relocated/collapsed:
- Kondisi (Baru/Bekas) badge moved from the badge row onto the photo itself (top-left corner overlay, nudged right when the pick-mode checkbox is also present — see 2026-10-01 follow-up below).
- The two separate "Harga Rekomendasi"/"Harga Bottom" preset buttons replaced with one sliding-switch pill (animated thumb, same `setPriceMode` call underneath) — per the user's explicit follow-up request ("bentuknya seperti saklar yang menyamping ... smooth").
- Diskon field collapsed behind a "+ Diskon" link, auto-expanded if the line already has a saved discount (so an existing value is never hidden).
- "Tersedia: N unit" and the separate Komisi pill merged into one line.
- Dimensi/Ketebalan/Daya Listrik specs collapsed behind a "Lihat Detail ▾" toggle, closed by default.
- Booked/Sudah DP badges shortened to a count ("Booked ×N"); the customer names (`bookedBy`/`dpBy`) moved to the badge's `title` tooltip instead of always inline.

**Acceptance criteria:** No feature removed — every element from before (checkbox, edit pencil, photo download, price input, preset switch, Diskon, Komisi, specs, booked/DP names, Add to Invoice) still reachable, just relocated/collapsed. Clean `tsc --noEmit`, clean `next build`.

**Files affected:** `components/katalog/ProductCard.tsx` only.

**Regression test:** `tsc --noEmit` clean, `next build` clean. Pre-existing lint errors in unrelated files (`Form.tsx`, `LoadingOverlay.tsx`, `SearchableSelect.tsx`, `server.js`) untouched by this change. Not yet click-tested live in a browser.

**Follow-up (2026-10-01):** User reported the Kondisi badge collided with `ZoomableImage`'s own dimension footnote (`photoLabelText`, e.g. "120cm x 80cm x 60cm") — both were placed at the photo's bottom-left corner. Moved Kondisi to top-left instead (same `top-8`/`top-2.5` offset the checkbox/pencil already use for Flash Sale, plus a `left-11` nudge when the pick-mode checkbox is also showing there). Verified with a static HTML reproduction of the 3 overlapping states (pick mode off/on, Flash Sale + pick mode together) since this environment has no logged-in browser session to click through Katalog live — `tsc --noEmit` clean.

---

## TASK-035 — Leaderboard Sales redesigned as a Soft Trade podium (mockup-approved)

**Type:** UX/UI
**Priority:** P2
**Status:** DONE (2026-09-30)
**Dependency:** None
**Created:** 2026-09-30 · **Last updated:** 2026-09-30

**Description:** User asked to replace the Leaderboard Sales UI ("terlalu kaku") with a top-3 podium matching the newer Katalog/Pelanggan "Soft Trade" look. Design Review done as an HTML mockup artifact, approved before coding (podium, desktop + mobile, data unchanged).
- Desktop: 3 rounded summary cards (team target/progress, sisa waktu, lewat target), then a 2-1-3 podium of rounded cards with initials avatars (#1 raised, yellow-tinted), then rank 4+ in one list card; the yellow footer became a soft rounded bar.
- Mobile: header without the dark bar; top 3 as cards shrinking in emphasis (#1 yellow-tinted hero), rank 4+ in one list card, "Posisi kamu" kept as a sticky rounded ink card.
- Fewer than 3 sales: only the filled podium cards render (1 sales = #1 alone). No sales: empty-state card. No target: "Belum ada target" chip, no bar.
- Estimasi Sales kept as a small chip, never affects ranking, still no komisi figure anywhere.

**Acceptance criteria:** Same data, ranking (Lunas-only), PeriodPicker, back button and Posisi kamu strip as before; presentation only. No API/schema change.

**Files affected:** `components/insentif/SalesBoard.tsx`, `components/insentif/MobileSalesBoard.tsx`, new `components/insentif/boardUtils.ts` (initials helper).

**Regression test:** `tsc --noEmit` clean, `eslint components/insentif` clean. `next build` not run, not yet click-tested live in a browser.

---

## TASK-036 — Komisi Saya redesigned: period filter, lunas-only headline, invoice status, payout history (mockup-approved)

**Type:** UX/UI + Feature
**Priority:** P2
**Status:** DONE (2026-10-01)
**Dependency:** None
**Created:** 2026-10-01 · **Last updated:** 2026-10-01

**Description:** User asked whether Komisi Saya (Sales/Manager) has a period filter, is modern, and has a payment history — it had none of the three. Design Review done as an HTML mockup artifact (4 iterations), approved before coding. Decisions: no "Tagih" feature, no mini Papan Peringkat, headline figure only commission from lunas invoices (the old total also counted unpaid invoices), invoices must show Lunas / Sudah DP / Belum Bayar and be openable.
- Period stepper ‹ Bulan Tahun › (`?bulan=&tahun=`, plain links, GMT+7, can't go past the running month, 24 months back).
- Headline = commission from lunas invoices, split Siap cair / Sudah dibayar (by `komisiCair`); unpaid commission = footnote + "Belum lunas" tab, never in the headline.
- Both waiting lists carry over from earlier months with a "dari {bulan}" chip.
- Each invoice row: status badge (reuses `FollowUpStatusBadge`), sisa tagihan for unpaid/DP, "Lihat invoice" → `/invoice/[id]` (existing per-sales guard applies).
- Riwayat pembayaran: transfers received in the month, grouped per batch (same grouping as `getPayrollHistory`), expandable per invoice, bukti transfer link when one exists, year total.
- Responsive: one tree — single column on phones, two columns from `lg`.

**Acceptance criteria:** Headline never includes unpaid-invoice commission; unpaid invoices from earlier months stay visible; no schema/API change; Slip Gaji (`/payroll`), `/insentif`, `/follow-up` untouched.

**Files affected:** `lib/insentif.ts` (new `getMyKomisiOverview` + types; existing functions untouched), `app/komisi-saya/page.tsx`, new `components/komisi/KomisiSayaView.tsx`, new `components/komisi/PeriodStepper.tsx`.

**Removed (explicit user decisions, not silent):** "Tagih" per-invoice button, "Tagih yang tertahan" button, mini Papan Peringkat on this page.

**Regression test:** `tsc --noEmit`, `eslint`, `next build` clean; data function run read-only against the real DB. Not click-tested in a logged-in browser.

**Follow-up (2026-10-01):** User renamed the two status labels — "Siap cair" (lunas, awaiting transfer) → "Komisi Tertunda", "Sudah dibayar" (already transferred) → "Komisi Siap Cair". Labels only (hero tiles, tab, aria-label in `components/komisi/KomisiSayaView.tsx`); field names (`siapCair`, `sudahDibayar`) and logic unchanged.

**Follow-up 2 (2026-10-01) — concept corrected:** the label-only rename above left the numbers ambiguous (labels sat on the wrong figures). User clarified: **Komisi Tertunda** = invoice not yet lunas (waiting for the customer); **Komisi Siap Cair** = invoice lunas, commission not yet transferred to the sales rep. Re-mocked (v5) and rebuilt: the headline is now Komisi Siap Cair; Komisi Tertunda is one small line + its own tab, never added into the headline; the "already transferred" figure was dropped (lives in Riwayat pembayaran). Both figures are balances up to the end of the selected month (earlier months included, "dari {bulan}" chip). `getMyKomisiOverview` lost `siapCairBulanLalu` / `sudahDibayar*` / `totalLunas` and one DB query; files: `lib/insentif.ts`, `components/komisi/KomisiSayaView.tsx`, `app/komisi-saya/page.tsx`.

---

## TASK-037 — Invoice detail's Riwayat shows when the commission was paid out

**Type:** UX/Feature
**Priority:** P2
**Status:** DONE (2026-10-01, deployed — commit 768ab94)
**Dependency:** TASK-036 (same commission-payout data)
**Created:** 2026-10-01 · **Last updated:** 2026-10-01

**Description:** User asked that the invoice's own "Riwayat" (timeline card on `/invoice/[id]`) also show when that invoice's commission was paid ("kapan invoice ini dibayarkan insentifnya"). Added one derived last line, "Komisi dibayarkan ke {sales}", dated `komisiCairTanggal`, when `komisiCair` is true. Derived at render time instead of pushed into `Invoice.riwayat` by the payout routes, so it covers all past payouts without a backfill (verified: all 38 invoices with `komisiCair` have a `komisiCairTanggal`) and disappears by itself if a payout is reversed via `/api/invoices/[id]/payout`. Appended last, existing entries' order untouched. Not part of `printData`, so it never reaches the customer-facing PDF.

**Acceptance criteria:** Existing riwayat lines unchanged and in the same order; paid-out invoices gain one line; unpaid-out invoices unchanged; no schema/API change; PDF unchanged.

**Files affected:** `app/invoice/[id]/page.tsx` only.

**Regression test:** `tsc --noEmit`, `eslint` clean; data precondition checked read-only against the real DB. Not click-tested in a logged-in browser.

---

## TASK-038 — Payroll (Owner) redesigned: modern layout, one shared month filter

**Type:** UX/UI
**Priority:** P2
**Status:** DONE (2026-10-01, deployed)
**Dependency:** TASK-036 (same visual language), TASK-002 SUBTASK-007 (Payroll was still un-swept)
**Created:** 2026-10-01 · **Last updated:** 2026-10-01

**Description:** User asked to modernize the owner-side Payroll screens "seperti yang sudah berubah sekarang" (Komisi Saya's look). Design Review done as an HTML mockup artifact first (5 versions: Komisi, Gaji, Riwayat, Karyawan, Absensi, desktop + phone), approved step by step before coding. Decisions from the user: **one** month filter for the whole Payroll section, not one per page; **Komisi gets no month filter** (unpaid commission is a running balance — a filter could hide commission that never got paid); tapping an invoice number opens the invoice PDF.
- New `PayrollNav` replaces the old subnav: tab pills + ONE month stepper (`?periode=YYYY-MM`, carried across Gaji/Absensi/Riwayat; hidden on Komisi and Karyawan; up to 6 months back via the arrow). Riwayat also has "Semua periode" (no param) because that is how it always opened.
- Komisi: summary card (total waiting, sales/invoice counts, kas), rounded daftar bayar, pay panel (right from `lg`; sticky bottom bar + folded "Detail pembayaran" on phones). Drawer content (`KomisiPaymentForm`) restyled; invoice number → `InvoicePdfModal` (invoice preview + "Unduh PDF" + "Buka halaman invoice").
- Gaji: one responsive tree replaces desktop sheet + `MobileGajiBulanan`; summary card with sales/karyawan split and paid progress, tipe filter pills, kas sebelum/sesudah on every screen size.
- Riwayat: cards grouped by month paid (subtotal per group), search + tipe pills, every old column kept per row, Komisi invoice drawer with invoice-PDF links.
- Karyawan: cards, Aktif switch, Edit/Hapus pills, add/edit forms under the row. Absensi: month from the shared stepper + a day strip, Hadir switch per row (still saves on every tap), "hadir X dari Y" card.

**Acceptance criteria:** No capability removed (inventory in the mockup's "Catatan desain"); payment/CSV/CRUD/absensi logic unchanged; Slip Gaji (`/payroll` for Sales), Komisi Saya, `/payroll/komisi/[nama]` still work; clean `tsc`/`eslint`/`next build`.

**Files affected:** new `lib/payrollPeriod.ts`, `components/payroll/{PayrollNav,ui}.tsx`, `components/invoice/InvoicePdfModal.tsx`, `app/api/invoices/[id]/print/route.ts`; rewritten UI in `components/insentif/{BayarKomisiSheet,KomisiPaymentForm}.tsx`, `components/payroll/{GajiBulananSheet,RiwayatPembayaranClient,KaryawanManager,AbsensiForm}.tsx`; `app/payroll/{page,gaji,karyawan,absensi,riwayat}/page.tsx`.

**Behavior notes (not removals):** Gaji's mobile page no longer renders `MobileGajiBulanan` (file left in place, now unused — candidate for deletion with approval) and now also has tanggal/bukti/catatan on phones (the old mobile version sent none). Absensi's page now remounts the form per day (`key={tanggal}`) — the old form kept the previous day's hadir state when the date changed. Current month/day for Gaji/Absensi default now uses GMT+7 (was server-local).

**Regression test:** `tsc --noEmit`, `eslint` (only the pre-existing `react-hooks/set-state-in-effect` error in `KaryawanManager`'s load-on-mount effect, unchanged from before), `next build` clean. Not click-tested in a logged-in browser.

---

## TASK-039 — Invoice detail (`/invoice/[id]`): max 2 buttons, one main card, "Aksi lainnya"

**Type:** UX/UI
**Priority:** P2
**Status:** DONE (2026-10-02, deployed) — built from mockup v7. Differences: no "Lanjutkan Edit"-style extras beyond the mockup; "Aksi lainnya" rows are Surat Jalan, Catat DP, Ubah Invoice, Hapus (WA and Unduh Invoice are the two icons on the document's top-right corner). Files changed: `app/invoice/[id]/page.tsx`, `components/invoice/InvoiceActions.tsx` (now `part="icons" | "suratJalan"`), `components/invoice/InvoiceMoreActions.tsx` (new). `tsc`, `eslint`, `next build` clean; not click-tested in a logged-in browser. (Earlier note: paused 2026-10-01 at the user's request, "nanti saya akan panggil".)
**Dependency:** TASK-030 (same "max 2 buttons" rule on the list), TASK-037 (Riwayat card must keep the komisi line)
**Created:** 2026-10-01 · **Last updated:** 2026-10-01

**Description:** User found the invoice detail page messy: 8 buttons exposed at once in "Belum bayar" (header: Ubah, Hapus, Kirim WA, Unduh Invoice, Unduh Surat Jalan; Status Pembayaran card: Tandai Lunas Manual, Catat DP; Status Pengiriman card: Tandai Sudah Kirim). Wants max 2 buttons, clear grouping, "lebih clean".

**Approved direction (mockup v6, HOJAY/Foundry look kept — an Apple-style variant was shown and rejected: "jelek, balikan ke awal"):**
- Max **2 action buttons**, one per pending lifecycle step: *Pembayaran* → "Tandai Lunas" (links to `/invoice/[id]/bayar`), *Pengiriman* → "Tandai Sudah Kirim" (existing `TandaiKirimButton` modal). Payment and shipping are independent (an invoice can ship before it is paid), so shipping is NOT folded into the menu. Draft → single "Lanjutkan Edit"; lunas+belum kirim → only "Tandai Sudah Kirim"; lunas+sudah kirim → "Kirim ke Pelanggan (WA)".
- Everything else goes in **"Aksi lainnya"**, placed in the SAME card directly under the buttons (user objected to it sitting far away in the header), shown with a one-line peek of its contents when closed; opens inline (not a floating dropdown). Groups: Dokumen (Kirim WA, Unduh Invoice PDF, Unduh Surat Jalan PDF), Pembayaran (Catat DP), Kelola (Ubah Invoice, Hapus — red, last).
- Right column: **one main card** (total, status pills, DP/sisa, actions, Aksi lainnya) + Riwayat card, instead of three cards. Header carries no action buttons. Phone: sidebar cards above the document.
- Visibility rules unchanged from today: Ubah/Hapus hidden when lunas, Hapus hidden once a DP exists, Catat DP only when unpaid with no DP, shipping not offered for draft.

**Update 2026-10-02 (mockup v7):** the user called Unduh Invoice "crucial" and asked for it, plus Kirim WA, to be icons. v7 puts two always-visible icon buttons (Kirim WA green, Unduh Invoice PDF yellow) at the top-right of the invoice document, in every status. Both are removed from "Aksi lainnya" (now: Surat Jalan, Catat DP, Ubah, Hapus), and the lunas+sudah kirim state no longer needs the big WA button. Icons assumed NOT to count toward the max-2 buttons (unconfirmed). Still to decide: label text beside icons on phone (no hover). Mockup: `docs/SDD/mockups/invoice-detail-v7.html` (artifact https://claude.ai/artifact/Dgnu2QPgMNNgWav5tcZanR, private). Status still waiting for go-ahead to code.

**Capability audit (planned):** all 8 current buttons remain reachable (2 visible + 6 in Aksi lainnya); nothing deleted. (v7: 2 icons + 2 buttons + 4 in Aksi lainnya.)

**Open decision when work resumes:** the user asked whether "Aksi lainnya" counts toward the max-2; assumed it does NOT (same as the ⋯ menu on the list). Confirm if needed.

**Files affected (planned):** `app/invoice/[id]/page.tsx`, `components/invoice/InvoiceActions.tsx` (render as menu items; WA/PDF logic untouched), one new small client component for the Aksi lainnya disclosure. NOT touched: `InvoiceDocument`, `InvoicePrintDoc`, `InvoiceListClient`, forms, APIs, `TandaiKirimButton`/`DeleteInvoiceButton` (reused as-is).

**Mockup files:** `docs/SDD/mockups/invoice-detail-v6.html` (approved direction, open in a browser) and `docs/SDD/mockups/invoice-detail-apple-rejected.html` (rejected, kept for reference). Published artifact: https://claude.ai/artifact/S6ejKetdBDbpToTsNjwLGB (private).

**Regression test (to do):** responsive check mobile/tablet/desktop, `tsc --noEmit`, `eslint`, `next build`.

---

## TASK-041 — Invoice list: fixed-column rows, chevron detail, Filter button, one-line summary

**Type:** UX/UI
**Priority:** P2
**Status:** DONE (2026-10-02, deployed)
**Dependency:** TASK-009, TASK-020, TASK-030, TASK-033 (this replaces the "⋯" menu those built)
**Created:** 2026-10-02 · **Last updated:** 2026-10-02

**Description:** User asked for a tidier Invoice list ("lebih rapih, grouping atau hide and show"), approved via mockup `docs/SDD/mockups/invoice-list-v1.html` ("semua yang di html saya suka, tinggal di deploy").

**Fix:** `InvoiceListClient.tsx` rows now use fixed columns (tanggal | pelanggan + no. | pembayaran + pengiriman pills | total | aksi). Visible actions: one next-step button (Lanjutkan / Tandai Lunas / Tandai Sudah Kirim), Preview and WA as icon buttons, and a chevron opening a detail row (Sales, Item, Pengiriman, Dibuat, Tandai Sudah Kirim when Tandai Lunas is the visible step, Ubah, Hapus). The "⋯" menu is gone; its items live in the icons and the detail. Under the "Semua" pill the list is grouped "Perlu tindakan" (not paid, or paid and not shipped) above "Selesai". The two summary cards became one line (jumlah + total nilai, still following the active pill). New `InvoiceFilterBar.tsx`: white search field, one Filter button with a count badge opening Bulan/Tahun/Sales, and a removable chip per active filter; filtering is still URL params read by `app/invoice/page.tsx`.

**Differences from the mockup:** the Unduh PDF icon in the detail row was NOT built (a direct download needs the hidden PDF layout mounted and paginated first); Unduh Invoice stays inside the Preview drawer. "N hari belum bayar" badge keeps its old rule (unpaid only, not DP). Draft rows show no WA icon or "Belum dikirim" pill.

**Files affected:** `components/invoice/InvoiceListClient.tsx`, `components/invoice/InvoiceFilterBar.tsx` (new), `app/invoice/page.tsx`. `InvoicePeriodFilter.tsx` is now unused (candidate for deletion with approval).
**Regression test:** `tsc --noEmit`, `eslint` on the 3 files, `next build` clean. Not click-tested in a logged-in browser.

---

## TASK-042 — Jasa (biaya service): master data terpisah, baris di invoice, tombol di Katalog

**Type:** Feature
**Priority:** P2
**Status:** DONE (2026-10-07, deployed; belum diklik di browser yang login)
**Dependency:** TASK-039, TASK-041 (pola Invoice), akuntansi COA
**Created:** 2026-10-07 · **Last updated:** 2026-10-07

**Description:** User minta biaya jasa diperlakukan beda dari produk. Disetujui lewat mockup `docs/SDD/mockups/jasa-v2.html` (versi 6): jasa terpisah dari produk, harga flat yang diinput per invoice, tanpa satuan/qty/keterangan, tanpa stok, harga bottom, diskon, komisi sales, maupun HPP. Tidak tampil sebagai kartu di Katalog maupun PDF katalog. Invoice boleh berisi jasa saja.

**Build:** `models/Jasa.ts` (nama, kode JS-0001, aktif), `/api/jasa`, tab Jasa di Inventory (`/produk/jasa`, form tambah/ubah). Invoice: item punya `isJasa` + `jasa`, qty selalu 1; `lib/services/jasaLine.ts` dipakai createInvoice/updateInvoice; `JasaRowEditor` + "+ Tambah Jasa" di InvoiceForm; komisi dan Diskon Bulk hanya menghitung produk. Jurnal lunas: baris jasa ke akun baru 4-1200 Pendapatan Jasa (tanpa diskon/HPP/komisi); Laba Rugi dan Neraca ikut menghitung 4-1200. Katalog: tombol kuning "+ Tambah" (Jasa, Pesan Produk Custom, Lihat Produk Custom) menggantikan dua tombol terpisah; panel jasa berisi isian harga + Tambah (nonaktif sampai harga diisi). Tampilan/cetak invoice: jasa di bawah produk, label "· Jasa", Qty dan Diskon "–", tidak masuk Surat Jalan.

**Katalog panel jasa (follow-up 2026-10-07):** dropdown Jasa dulu, isian Harga Jasa baru aktif setelah jasa dipilih, tombol "+ Tambah jasa lain" untuk dua jasa atau lebih sekaligus (baris bisa dihapus ×). Pilihan "+ Jasa baru..." di dropdown (supaya sales bisa membuat jasa sendiri) belum diputuskan, tidak dibangun.

**Hapus jasa (follow-up 2026-10-07):** tombol Hapus di tab Jasa (`DeleteJasaButton`, `DELETE /api/jasa/[id]`), hanya Owner (aturan yang sama dengan hapus produk), dengan dialog konfirmasi. Jasa yang sudah dipakai di invoice ditolak (409, "Nonaktifkan saja lewat Ubah"), karena halaman Ubah invoice dan `updateInvoice` mencari jasa berdasarkan id. Dikonfirmasi user. Deployed.

**Differences from the mockup:** panel jasa di Katalog berupa pop-up (bukan panel inline); cetak invoice tidak punya subjudul pemisah Produk/Jasa (hanya diurutkan dan diberi label).

**Decisions (user, 2026-10-07):** jasa TIDAK dihitung di Leaderboard Insentif (`lib/insentif.ts`: qty, totalPenjualan, target); jasa boleh muncul di dashboard; invoice jasa saja tetap punya field pengiriman dan Surat Jalan, dan Surat Jalan-nya mendaftar baris jasa (kalau invoice punya produk, Surat Jalan hanya mendaftar produk).

**Open points:** (1) Surat Jalan invoice jasa saja belum dilihat hasil PDF-nya. (2) `/api/jasa` belum punya cek peran (sama seperti `/api/products`).

**Files affected:** `models/Jasa.ts`, `models/Invoice.ts`, `app/api/jasa/**`, `app/produk/(list)/jasa`, `app/produk/jasa/**`, `app/produk/(list)/layout.tsx`, `components/produk/JasaForm.tsx`, `components/invoice/{JasaRowEditor,InvoiceForm,InvoiceDocument,InvoicePrintDoc}.tsx`, `components/katalog/{KatalogAddMenu,KatalogClient}.tsx`, `components/cart/CartProvider.tsx`, `lib/{jasaCart,coa,akuntansi,counters,invoiceDisplay}.ts`, `lib/services/{jasaLine,createInvoice,updateInvoice,journal}.ts`, `app/invoice/page.tsx`, `app/invoice/[id]/{page,ubah/page}.tsx`, `app/api/invoices/[id]/print/route.ts`, `app/akuntansi/laba-rugi/page.tsx`.
**Regression test:** `tsc --noEmit` dan `next build` bersih. ESLint pada file yang diubah hanya melaporkan temuan lama (setState di effect pada CartProvider/InvoiceForm). Belum diklik di browser yang login.

---

## TASK-043 — Katalog: label "New Stock" (produk baru diupload, 7 hari, tampil paling atas)

**Type:** Feature
**Priority:** P2
**Status:** DONE (2026-10-09, pushed ke main untuk deploy Vercel; belum diklik di browser yang login)
**Dependency:** TASK-012 (Katalog server-paginated), Flash Sale banner di `ProductCard`
**Created:** 2026-10-09 · **Last updated:** 2026-10-09

**Requirement:** Produk yang baru diupload (`Product.createdAt` ≤ 7 hari, bukan produk custom, stok > 0) diberi banner hijau "✦ NEW STOCK" di foto (seperti banner Flash Sale) dan dikumpulkan di section "New Stock" di atas grid Katalog. Setelah 7 hari label dan section hilang otomatis. Tanpa hitungan hari. Ini BUKAN status kondisi Baru/Bekas (produk Bekas yang baru diupload tetap dapat label). Mockup disetujui: `docs/SDD/mockups/katalog-barang-baru-v1.html` (artifact https://claude.ai/artifact/4H1CUzq45rESv3zKeqXsBs).

**Existing system analysis:** Sudah ada "Produk Baru" (`getProdukBaruIds`, `PRODUK_BARU_DAYS = 3`, hanya yang belum pernah terjual) yang dipakai filter "Hanya Produk Baru", urutan default Katalog, dan badge nav Inventory. Dibiarkan apa adanya (Opsi B: aturan terpisah). Katalog diambil per 12 produk (infinite scroll) lewat `queryKatalogProducts` / `/api/katalog`.

**Impact: LOW.** ADD konstanta `NEW_STOCK_DAYS`, ADD `getNewStockIds` + `queryNewStockProducts`, EXTEND `KatalogProduct.isNewStock`, EXTEND query grid dengan opsi `excludeNewStock`, EXTEND `ProductCard` (banner) dan `KatalogClient` (section). Tidak ada perubahan skema/DB.

**Plan / rules:**
- Section hanya tampil saat tidak ada pencarian dan tidak ada filter aktif; produk yang sama tidak muncul dua kali (grid mengecualikannya selama section tampil). Saat mencari/memfilter, produk New Stock muncul di grid biasa dengan banner.
- Produk yang sedang Flash Sale: banner Flash Sale yang menang.
- "Pilih Semua" (PDF) tetap mencakup produk New Stock. PDF katalog tidak berubah.
- Di HP, section berupa baris yang digeser ke samping.

**Files affected:** `lib/constants.ts`, `lib/katalog.ts`, `app/api/katalog/route.ts`, `app/katalog/page.tsx`, `components/katalog/ProductCard.tsx`, `components/katalog/KatalogClient.tsx`.
**Files NOT changed:** `getProdukBaruIds`/`PRODUK_BARU_DAYS`, filter sidebar, nav badge, PDF katalog, model `Product`.
**Acceptance criteria:** produk ≤ 7 hari punya banner dan muncul di section; > 7 hari tidak; tidak duplikat; filter/search/infinite scroll/edit/Flash Sale/Pilih Semua tetap jalan; `tsc` dan `next build` bersih.

**Build:** `NEW_STOCK_DAYS = 7`; `getNewStockIds`, `queryNewStockProducts`, opsi `excludeNewStock`, field `isNewStock`, `/api/katalog?mode=newStock`; banner hijau di `ProductCard` (Flash Sale menang bila keduanya berlaku); section "New Stock" di `KatalogClient` (baris geser di HP, grid dari sm ke atas), tampil hanya tanpa pencarian dan tanpa filter aktif.
**Regression test:** `tsc --noEmit`, `eslint` pada 5 file, dan `next build` bersih. Belum diklik di browser yang login.
**Open points:** (1) jika dalam seminggu banyak produk diupload, section ikut memanjang (tanpa batas jumlah). (2) Section tidak diperbarui otomatis saat produk habis stok di sesi yang sedang terbuka (ikut tersegarkan saat halaman dimuat ulang).

---

