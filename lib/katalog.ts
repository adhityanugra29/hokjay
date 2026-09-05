import { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Product } from "@/models/Product";
import { StockMovement } from "@/models/StockMovement";
import { Category } from "@/models/Category";
import { PRODUK_BARU_DAYS } from "@/lib/constants";
import { resolveKomisiBekasPercent } from "@/lib/commission";
import type { KatalogProduct } from "@/components/katalog/ProductCard";

// Only these roles get the inline "edit product" pencil / the raw Flash
// Sale override field — moved here from app/katalog/page.tsx (2026-09-04,
// TASK-012) so app/api/katalog/route.ts can apply the exact same gating
// on every subsequent paginated request without a second, driftable copy.
export const CAN_EDIT_PRODUCT_ROLES = ["manager", "owner", "super_admin"];
export const CAN_FLASH_SALE_ROLES = ["owner", "super_admin"];

export interface ProductInvoiceStatus {
  /** Qty across unpaid invoices with no DP recorded — "Booked". */
  bookedQty: number;
  /** Unique sales names holding a Booked qty for this product. */
  bookedBy: string[];
  /** Qty across unpaid invoices that have received a DP — "Sudah DP". */
  dpQty: number;
  /** Unique sales names holding a Sudah DP qty for this product. */
  dpBy: string[];
  /** Total units ever sold (paid) — "SOLD xx", lifetime historical count. */
  soldQty: number;
}

/**
 * Per-product Booked/Sudah DP/SOLD status for the Katalog cards — added
 * 2026-08-27 alongside moving stock deduction to invoice-paid time. An
 * unpaid invoice ("Booked", or "Sudah DP" once a down payment lands) no
 * longer touches Product.stok at all, so without this a sales rep browsing
 * Katalog would have no idea a product already has a customer lined up for
 * it. Per the user's request: "supaya sales aware, siapa yang book".
 *
 * A product can have several simultaneous invoices (some Booked, some DP'd,
 * possibly by different sales reps) — this returns the combined qty/names
 * for each bucket rather than collapsing to one "most advanced" status, per
 * the user's confirmed choice.
 *
 * Reads status straight off Invoice.status/dp — NOT off StockMovement.
 * An earlier version derived "SOLD" from StockMovement("Penjualan")
 * records, which for an invoice finalized under the pre-2026-08-27 rule
 * (stock decremented at "unpaid" time, not "paid") wrongly showed SOLD for
 * an invoice that hadn't actually been paid yet. Per the user's bug report
 * 2026-08-27 ("jika belum dibayar, itu statusnya booked bukan sold").
 *
 * `excludeInvoiceId` — pass the invoice currently being edited (see the
 * Invoice "Tambah Produk" sidebar) so its own qty doesn't count against
 * itself. Without this, removing a product from the very invoice that was
 * the ONLY thing keeping it "Booked" still showed it as Booked/unavailable
 * until the edit was saved — the qty a sales rep is actively adjusting on
 * this invoice was never really "someone else's" claim on the product. Per
 * the user's bug report 2026-08-27.
 */
export async function getProductInvoiceStatusMap(excludeInvoiceId?: string): Promise<Map<string, ProductInvoiceStatus>> {
  await dbConnect();

  const unpaidFilter: Record<string, unknown> = { status: "unpaid" };
  if (excludeInvoiceId) unpaidFilter._id = { $ne: excludeInvoiceId };

  const [unpaidInvoices, paidInvoices] = await Promise.all([
    Invoice.find(unpaidFilter, { items: 1, dp: 1, sales: 1 }).lean(),
    Invoice.find({ status: "paid" }, { items: 1 }).lean(),
  ]);

  const map = new Map<string, ProductInvoiceStatus>();

  function ensure(productId: string): ProductInvoiceStatus {
    let status = map.get(productId);
    if (!status) {
      status = { bookedQty: 0, bookedBy: [], dpQty: 0, dpBy: [], soldQty: 0 };
      map.set(productId, status);
    }
    return status;
  }

  for (const inv of unpaidInvoices) {
    const salesName = inv.sales?.nama?.trim() || "—";
    const hasDp = !!inv.dp?.nominal;
    for (const item of inv.items) {
      if (!item.product) continue;
      const status = ensure(String(item.product));
      if (hasDp) {
        status.dpQty += item.qty;
        if (!status.dpBy.includes(salesName)) status.dpBy.push(salesName);
      } else {
        status.bookedQty += item.qty;
        if (!status.bookedBy.includes(salesName)) status.bookedBy.push(salesName);
      }
    }
  }

  for (const inv of paidInvoices) {
    for (const item of inv.items) {
      if (!item.product) continue;
      ensure(String(item.product)).soldQty += item.qty;
    }
  }

  return map;
}

/**
 * Category name -> its Owner-set default barang-bekas commission rate (%),
 * only for categories that actually have one set. Feed the looked-up value
 * (or undefined) into resolveKomisiBekasPercent() alongside the product's
 * own Product.komisiBekasPercent — that function decides which wins. One
 * query for every category rather than one per product, since every server
 * page/route that needs this is already listing many products at once.
 * Per the user's request 2026-09-03.
 */
export async function getKategoriKomisiBekasMap(): Promise<Map<string, number>> {
  await dbConnect();
  const categories = await Category.find(
    { komisiBekasPercent: { $exists: true, $ne: null } },
    { name: 1, komisiBekasPercent: 1 }
  ).lean();
  return new Map(categories.map((c) => [c.name, c.komisiBekasPercent as number]));
}

/**
 * IDs of "Produk Baru" — added within the last PRODUK_BARU_DAYS days and
 * never sold (any StockMovement with alasan "Penjualan"). Same rule the
 * Inventory nav badge already uses (app/layout.tsx, app/menu/page.tsx),
 * shared here so the Katalog Filter sidebar's "Produk Baru" filter can't
 * drift from it. Per the user's request 2026-08-28 (window changed from
 * 7 days to PRODUK_BARU_DAYS/3 at the same time, applied everywhere).
 */
export async function getProdukBaruIds(): Promise<Set<string>> {
  await dbConnect();
  const since = new Date(Date.now() - PRODUK_BARU_DAYS * 24 * 60 * 60 * 1000);
  const [products, soldProductIds] = await Promise.all([
    Product.find({ createdAt: { $gte: since }, isCustom: { $ne: true } }, { _id: 1 }).lean(),
    StockMovement.distinct("product", { alasan: "Penjualan" }),
  ]);
  const soldSet = new Set(soldProductIds.map((id) => String(id)));
  return new Set(products.map((p) => String(p._id)).filter((id) => !soldSet.has(id)));
}

// ---------------------------------------------------------------------
// Server-paginated Katalog query — TASK-012 (2026-09-04), per the user's
// request to limit the actual data pull to 12 products/batch (infinite
// scroll) instead of shipping every matching product on every page load.
// Moved here from KatalogClient.tsx's client-side `filtered` useMemo so
// app/katalog/page.tsx (page 1, server-rendered) and app/api/katalog/route.ts
// (every page after, plus every filter/search/sort change) share one
// implementation instead of two that could drift apart.
// ---------------------------------------------------------------------

export interface KatalogFiltersInput {
  search?: string;
  categories?: string[];
  kondisi?: "" | "baru" | "bekas";
  tipe?: "" | "elektronik" | "non-elektronik";
  hargaMin?: string;
  hargaMax?: string;
  hargaBasis?: "rekomendasi" | "minimum";
  nama?: string;
  ukuran?: string;
  produkBaru?: boolean;
  sort?: "" | "price-asc" | "price-desc";
}

/**
 * A query only counts as a size query if, once split on x/×/,/-/whitespace,
 * every token is a plain number — so "80" alone still matches a single
 * dimension, "80 x 60 x 100" matches all three, but something like "Meja
 * 80" (mixed text) is left to the normal name/SKU/merk text search. Ported
 * verbatim from KatalogClient.tsx's original client-side version (same
 * behavior, ported 2026-09-04 so a Mongo query can be built from it
 * instead of filtering an in-memory array) — per the user's request
 * 2026-09-02 ("bisa search juga by ukuran 80 x 60 x 100").
 */
export function parseSizeQuery(query: string): number[] | null {
  const tokens = query
    .trim()
    .split(/[xX×,\-\s]+/)
    .filter(Boolean);
  if (tokens.length === 0) return null;
  const nums: number[] = [];
  for (const t of tokens) {
    if (!/^\d+(\.\d+)?$/.test(t)) return null;
    nums.push(Number(t));
  }
  return nums;
}

/**
 * Every number in `nums` must match one of panjang/lebar/tinggi (partial
 * — fewer than 3 numbers is fine — unordered), mirroring
 * matchesSizeQuery()'s original client-side semantics exactly. Each
 * number becomes its own $or-of-three-sides clause; the whole thing is an
 * $and of those (every number must find *some* matching side).
 */
function sizeMatchClauses(nums: number[]): Record<string, unknown>[] {
  return nums.map((n) => ({
    $or: [{ "dimensi.panjangCm": n }, { "dimensi.lebarCm": n }, { "dimensi.tinggiCm": n }],
  }));
}

/**
 * Shared prep for both queryKatalogProducts and queryKatalogAvailableIds:
 * the base Mongo $match (every KatalogFilters field that maps onto a real
 * Product field or a precomputed id set) plus the two things that don't
 * — booked/DP/sold status (from invoices, not a Product field) and
 * Produk Baru ids — computed once regardless of which filters are active,
 * matching app/katalog/page.tsx's original always-compute-all-three cost
 * (both are already cheap/bounded by invoice count or recent-product
 * count, not by catalog size).
 */
async function prepareKatalogMatch(filters: KatalogFiltersInput) {
  await dbConnect();
  const [statusMap, produkBaruIds, kategoriKomisiBekasMap] = await Promise.all([
    getProductInvoiceStatusMap(),
    getProdukBaruIds(),
    getKategoriKomisiBekasMap(),
  ]);

  // Custom-order products live on /katalog/custom, sold-out (stok 0) ones
  // are hidden — same "hide, don't delete" rule the plain, unpaginated
  // query used before this task.
  const match: Record<string, unknown> = { isCustom: { $ne: true }, stok: { $gt: 0 } };
  const andClauses: Record<string, unknown>[] = [];

  if (filters.categories && filters.categories.length > 0) match.category = { $in: filters.categories };
  if (filters.kondisi) match.kondisi = filters.kondisi;
  if (filters.tipe) match.tipeProduk = filters.tipe;

  const hargaField = filters.hargaBasis === "minimum" ? "hargaMinimum" : "hargaRekomendasi";
  if (filters.hargaMin || filters.hargaMax) {
    const range: Record<string, number> = {};
    if (filters.hargaMin) range.$gte = Number(filters.hargaMin);
    if (filters.hargaMax) range.$lte = Number(filters.hargaMax);
    match[hargaField] = range;
  }

  if (filters.nama) {
    andClauses.push({ name: { $regex: filters.nama.trim(), $options: "i" } });
  }

  if (filters.ukuran) {
    const sizeNums = parseSizeQuery(filters.ukuran);
    // No match at all (not "ignore the filter") when the sidebar's manual
    // Ukuran field doesn't parse as a size query — same as the client
    // version, which only ever matched via matchesSizeQuery here, never a
    // text fallback.
    andClauses.push(sizeNums ? { $and: sizeMatchClauses(sizeNums) } : { _id: null });
  }

  const search = filters.search?.trim().toLowerCase();
  if (search) {
    const sizeNums = parseSizeQuery(search);
    const searchOr: Record<string, unknown>[] = [
      { name: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
      { merk: { $regex: search, $options: "i" } },
    ];
    if (sizeNums) searchOr.push({ $and: sizeMatchClauses(sizeNums) });
    andClauses.push({ $or: searchOr });
  }

  if (filters.produkBaru) {
    match._id = { $in: [...produkBaruIds].filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id)) };
  }

  if (andClauses.length > 0) match.$and = andClauses;

  // Booked/Sudah DP/SOLD sink to the bottom of the grid — this is what
  // decides that, not the $match above (an encumbered product still
  // matches every filter, it just sorts last). Aggregation expressions
  // ($addFields/$in below) aren't schema-cast by Mongoose the way
  // .find() filters are, so these need to be real ObjectIds already.
  const encumberedObjectIds = [...statusMap.keys()]
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));
  // Produk Baru leads the default sort (see queryKatalogProducts) — same
  // ObjectId-casting reason as encumberedObjectIds above.
  const produkBaruObjectIds = [...produkBaruIds]
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  return { match, statusMap, produkBaruIds, kategoriKomisiBekasMap, encumberedObjectIds, produkBaruObjectIds };
}

/** Same per-product mapping app/katalog/page.tsx did inline before this task — kept identical so nothing about what a card shows changes. */
function toKatalogProduct(
  p: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any -- plain aggregate() output, not a typed Mongoose doc
  ctx: {
    statusMap: Map<string, ProductInvoiceStatus>;
    produkBaruIds: Set<string>;
    kategoriKomisiBekasMap: Map<string, number>;
    canEditProduct?: boolean;
    canFlashSale?: boolean;
  }
): KatalogProduct {
  const id = String(p._id);
  const status = ctx.statusMap.get(id);
  return {
    _id: id,
    name: p.name,
    sku: p.sku,
    category: p.category,
    hargaRekomendasi: p.hargaRekomendasi,
    hargaMinimum: p.hargaMinimum,
    komisiPercent: p.komisiPercent,
    komisiNominal: p.komisiNominal,
    stok: p.stok,
    kondisi: p.kondisi ?? "baru",
    kondisiPercent: p.kondisiPercent ?? undefined,
    dimensi: p.dimensi ?? undefined,
    ketebalan: p.ketebalan ?? undefined,
    dayaListrik: p.dayaListrik ?? undefined,
    fotoUrl: p.fotoUrl ?? undefined,
    isCustom: p.isCustom ?? false,
    tipeProduk: p.tipeProduk ?? undefined,
    merk: p.merk ?? undefined,
    komisiBekasPercent: resolveKomisiBekasPercent(p.komisiBekasPercent, ctx.kategoriKomisiBekasMap.get(p.category)),
    ...(ctx.canEditProduct && {
      tanggalBarangMasuk: p.tanggalBarangMasuk ? new Date(p.tanggalBarangMasuk).toISOString() : undefined,
      stokMinimum: p.stokMinimum ?? undefined,
      alertHariTidakTerjual: p.alertHariTidakTerjual ?? undefined,
      fotoSampingUrl: p.fotoSampingUrl ?? undefined,
      fotoBelakangUrl: p.fotoBelakangUrl ?? undefined,
      deskripsi: p.deskripsi ?? undefined,
    }),
    ...(ctx.canFlashSale && { komisiBekasOverride: p.komisiBekasPercent ?? undefined }),
    bookedQty: status?.bookedQty ?? 0,
    bookedBy: status?.bookedBy ?? [],
    dpQty: status?.dpQty ?? 0,
    dpBy: status?.dpBy ?? [],
    soldQty: status?.soldQty ?? 0,
    isBaru: ctx.produkBaruIds.has(id),
    flashSale: p.flashSale?.active ? { active: true as const, harga: p.flashSale.harga ?? 0 } : undefined,
  };
}

export interface KatalogQueryResult {
  products: KatalogProduct[];
  nextCursor: number | null;
}

/**
 * One page of the Katalog grid — 12 products/batch by default (the user's
 * explicit ask), server-side filtered/sorted/grouped exactly like the old
 * client-side `filtered` useMemo did: Flash Sale always leads (tier 0),
 * then available stock (tier 1), then booked/DP/sold (tier 2) — booked/DP/
 * sold isn't a Product field, so this needs a real aggregation (not a
 * plain .find()) to fold `encumberedObjectIds` into a sortable field.
 * `_id: 1` is always the final sort tiebreaker so paginated results stay
 * stable across requests even as other products' data changes concurrently.
 */
export async function queryKatalogProducts(
  filters: KatalogFiltersInput,
  opts: { cursor?: number; limit?: number; canEditProduct?: boolean; canFlashSale?: boolean }
): Promise<KatalogQueryResult> {
  const cursor = opts.cursor ?? 0;
  const limit = opts.limit ?? 12;
  const { match, statusMap, produkBaruIds, kategoriKomisiBekasMap, encumberedObjectIds, produkBaruObjectIds } =
    await prepareKatalogMatch(filters);

  // Default order ("Urutkan: Default") is Produk Terbaru -> Kategori ->
  // Harga (termahal dulu) — per the user's explicit request 2026-09-05,
  // confirmed: "Produk Terbaru" reuses the existing Produk Baru concept
  // (same "added recently, never sold" rule as the Filter sidebar's
  // "Hanya Produk Baru" checkbox, not a raw createdAt sort) as a leading
  // block, not a continuous tiebreaker. Picking "Harga: Terendah/Tertinggi"
  // from the Urutkan dropdown is a full override of all three — becomes
  // the ONLY sort key below Flash Sale/booked-DP-sold tier, Produk
  // Baru/Kategori no longer group at all (also confirmed with the user).
  const sortStage: Record<string, 1 | -1> =
    filters.sort === "price-asc"
      ? { tier: 1, hargaRekomendasi: 1, _id: 1 }
      : filters.sort === "price-desc"
        ? { tier: 1, hargaRekomendasi: -1, _id: 1 }
        : { tier: 1, produkBaruRank: 1, category: 1, hargaRekomendasi: -1, _id: 1 };

  const docs = await Product.aggregate([
    { $match: match },
    {
      $addFields: {
        tier: {
          $cond: [
            "$flashSale.active",
            0,
            { $cond: [{ $in: ["$_id", encumberedObjectIds] }, 2, 1] },
          ],
        },
        produkBaruRank: { $cond: [{ $in: ["$_id", produkBaruObjectIds] }, 0, 1] },
      },
    },
    { $sort: sortStage },
    { $skip: cursor },
    { $limit: limit },
  ]);

  const products = docs.map((p) =>
    toKatalogProduct(p, {
      statusMap,
      produkBaruIds,
      kategoriKomisiBekasMap,
      canEditProduct: opts.canEditProduct,
      canFlashSale: opts.canFlashSale,
    })
  );

  return { products, nextCursor: products.length === limit ? cursor + limit : null };
}

/**
 * Every id (with real available stock — stok minus Booked/Sudah DP) that
 * matches the current filters, unpaginated — powers "Pilih Semua" (see
 * KatalogClient.tsx), which needs the complete matching set the moment
 * picking starts, not just whatever's been scrolled into view so far.
 * Deliberately only fetches `_id`/`stok` (not full documents) since this
 * is the one place that still needs "every match at once" — keeping it
 * cheap is what makes that acceptable alongside the paginated grid above.
 */
export async function queryKatalogAvailableIds(filters: KatalogFiltersInput): Promise<string[]> {
  const { match, statusMap } = await prepareKatalogMatch(filters);
  const docs = await Product.find(match, { stok: 1 }).lean();
  return docs
    .filter((p) => {
      const status = statusMap.get(String(p._id));
      const available = p.stok - (status?.bookedQty ?? 0) - (status?.dpQty ?? 0);
      return available > 0;
    })
    .map((p) => String(p._id));
}
