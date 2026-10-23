import { cache } from "react";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Product } from "@/models/Product";
import { StockMovement } from "@/models/StockMovement";
import { Category } from "@/models/Category";
import { PRODUK_BARU_DAYS, NEW_STOCK_DAYS } from "@/lib/constants";
import { resolveKomisiBekasPercent } from "@/lib/commission";
import type { KatalogProduct } from "@/components/katalog/ProductCard";

// Roles allowed the inline "edit product" pencil / raw Flash Sale override; shared by app/katalog/page.tsx and app/api/katalog/route.ts so both
// gate identically.
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
 * Per-product Booked/Sudah DP/SOLD status for Katalog cards. An unpaid invoice ("Booked", or "Sudah DP" once a DP lands) does not touch
 * Product.stok, so this tells sales a product already has a customer lined up. A product can have several simultaneous invoices (different
 * sales), so each bucket returns the combined qty/names rather than one "most advanced" status.
 * Reads Invoice.status/dp directly, NOT StockMovement: deriving SOLD from StockMovement("Penjualan") wrongly showed SOLD for invoices
 * finalized under the pre-2026-08-27 rule (stock decremented at "unpaid" time).
 * `excludeInvoiceId`: the invoice being edited ("Tambah Produk" sidebar), so its own qty doesn't count against itself.
 */
async function loadProductInvoiceStatusMap(excludeInvoiceId?: string): Promise<Map<string, ProductInvoiceStatus>> {
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

/** Per-request memo: the page, queryKatalogProducts and queryNewStockProducts all need it; computed once per render. Treat the result as read-only. */
export const getProductInvoiceStatusMap = cache(loadProductInvoiceStatusMap);

/**
 * Category name -> its Owner-set default bekas commission rate (%), only for categories that set one. Feed the value (or undefined) into
 * resolveKomisiBekasPercent() with the product's own override. One query for all categories, since callers list many products at once.
 */
async function loadKategoriKomisiBekasMap(): Promise<Map<string, number>> {
  await dbConnect();
  const categories = await Category.find(
    { komisiBekasPercent: { $exists: true, $ne: null } },
    { name: 1, komisiBekasPercent: 1 }
  ).lean();
  return new Map(categories.map((c) => [c.name, c.komisiBekasPercent as number]));
}

/** Per-request memo (read-only result). */
export const getKategoriKomisiBekasMap = cache(loadKategoriKomisiBekasMap);

/**
 * IDs of "Produk Baru": added within the last PRODUK_BARU_DAYS days and never sold (any StockMovement with alasan "Penjualan"). Same rule as
 * the Inventory nav badge (app/layout.tsx, app/menu/page.tsx); shared so the Katalog filter can't drift from it.
 */
async function loadProdukBaruIds(): Promise<Set<string>> {
  await dbConnect();
  const since = new Date(Date.now() - PRODUK_BARU_DAYS * 24 * 60 * 60 * 1000);
  const products = await Product.find({ createdAt: { $gte: since }, isCustom: { $ne: true } }, { _id: 1 }).lean();
  if (products.length === 0) return new Set();
  // Look up sales only for these few recent products (not the whole movement history); {alasan, product} is indexed.
  const soldProductIds = await StockMovement.distinct("product", {
    alasan: "Penjualan",
    product: { $in: products.map((p) => p._id) },
  });
  const soldSet = new Set(soldProductIds.map((id) => String(id)));
  return new Set(products.map((p) => String(p._id)).filter((id) => !soldSet.has(id)));
}

/** Per-request memo (read-only result): the layout badge, /menu and the Katalog queries share one lookup per render. */
export const getProdukBaruIds = cache(loadProdukBaruIds);

/** IDs of "New Stock": uploaded (createdAt) within NEW_STOCK_DAYS days, sold or not. Custom-order products excluded (they live on /katalog/custom). */
async function loadNewStockIds(): Promise<Set<string>> {
  await dbConnect();
  const since = new Date(Date.now() - NEW_STOCK_DAYS * 24 * 60 * 60 * 1000);
  const products = await Product.find({ createdAt: { $gte: since }, isCustom: { $ne: true } }, { _id: 1 }).lean();
  return new Set(products.map((p) => String(p._id)));
}

/** Per-request memo (read-only result). */
export const getNewStockIds = cache(loadNewStockIds);

// Server-paginated Katalog query, shared by app/katalog/page.tsx (page 1) and app/api/katalog/route.ts (every later page and filter/search/sort
// change) so the two can't drift apart.

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
  /** Leave out products shown in the Katalog's "New Stock" section (TASK-043) so they don't appear twice. */
  excludeNewStock?: boolean;
  sort?: "" | "price-asc" | "price-desc";
}

/**
 * A query is a size query only if, after splitting on x/×/,/-/whitespace, every token is a plain number: "80" matches one dimension,
 * "80 x 60 x 100" all three, "Meja 80" (mixed text) falls through to the normal name/SKU/merk search.
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

/** Every number must match one of panjang/lebar/tinggi (partial and unordered are fine): one $or-of-three-sides clause per number, $and-ed. */
function sizeMatchClauses(nums: number[]): Record<string, unknown>[] {
  return nums.map((n) => ({
    $or: [{ "dimensi.panjangCm": n }, { "dimensi.lebarCm": n }, { "dimensi.tinggiCm": n }],
  }));
}

/**
 * Shared prep for queryKatalogProducts and queryKatalogAvailableIds: the base Mongo $match plus booked/DP/sold status (from invoices, not a
 * Product field) and Produk Baru ids, always computed (both are cheap: bounded by invoice count / recent products).
 */
async function prepareKatalogMatch(filters: KatalogFiltersInput) {
  await dbConnect();
  const [statusMap, produkBaruIds, kategoriKomisiBekasMap, newStockIds] = await Promise.all([
    getProductInvoiceStatusMap(),
    getProdukBaruIds(),
    getKategoriKomisiBekasMap(),
    getNewStockIds(),
  ]);

  // Custom-order products live on /katalog/custom; sold-out (stok 0) ones are hidden, not deleted.
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
    // An Ukuran field that doesn't parse as a size query matches nothing (not "ignore the filter"); no text fallback.
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

  if (filters.excludeNewStock && newStockIds.size > 0) {
    andClauses.push({
      _id: { $nin: [...newStockIds].filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id)) },
    });
  }

  if (andClauses.length > 0) match.$and = andClauses;

  // Booked/DP/SOLD sink to the bottom via the sort tier below, not the $match (an encumbered product still matches every filter).
  // Aggregation expressions are not schema-cast like .find() filters, so these must already be real ObjectIds.
  const encumberedObjectIds = [...statusMap.keys()]
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));
  // Produk Baru leads the default sort; same ObjectId-casting reason.
  const produkBaruObjectIds = [...produkBaruIds]
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  return { match, statusMap, produkBaruIds, newStockIds, kategoriKomisiBekasMap, encumberedObjectIds, produkBaruObjectIds };
}

/** Maps one product (aggregate output) to a Katalog card. */
function toKatalogProduct(
  p: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any -- plain aggregate() output, not a typed Mongoose doc
  ctx: {
    statusMap: Map<string, ProductInvoiceStatus>;
    produkBaruIds: Set<string>;
    newStockIds: Set<string>;
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
    isNewStock: ctx.newStockIds.has(id),
    flashSale: p.flashSale?.active ? { active: true as const, harga: p.flashSale.harga ?? 0 } : undefined,
  };
}

/**
 * One product shaped like a Katalog grid card, for EditProductDrawer's post-save refresh: KatalogClient keeps its list in client state seeded
 * once from the server, so router.refresh() never reached it. The drawer fetches the one edited product and patches it into that state.
 */
export async function getKatalogProductById(
  id: string,
  opts: { canEditProduct?: boolean; canFlashSale?: boolean }
): Promise<KatalogProduct | null> {
  await dbConnect();
  const [product, statusMap, produkBaruIds, newStockIds, kategoriKomisiBekasMap] = await Promise.all([
    Product.findById(id).lean(),
    getProductInvoiceStatusMap(),
    getProdukBaruIds(),
    getNewStockIds(),
    getKategoriKomisiBekasMap(),
  ]);
  if (!product) return null;
  return toKatalogProduct(product, {
    statusMap,
    produkBaruIds,
    newStockIds,
    kategoriKomisiBekasMap,
    canEditProduct: opts.canEditProduct,
    canFlashSale: opts.canFlashSale,
  });
}

export interface KatalogQueryResult {
  products: KatalogProduct[];
  nextCursor: number | null;
}

/**
 * One page of the Katalog grid (12/batch): Flash Sale first (tier 0), then available stock (tier 1), then booked/DP/sold (tier 2). That needs
 * an aggregation to fold `encumberedObjectIds` into a sortable field. `_id: 1` is the final tiebreaker so pagination stays stable.
 */
export async function queryKatalogProducts(
  filters: KatalogFiltersInput,
  opts: { cursor?: number; limit?: number; canEditProduct?: boolean; canFlashSale?: boolean }
): Promise<KatalogQueryResult> {
  const cursor = opts.cursor ?? 0;
  const limit = opts.limit ?? 12;
  const { match, statusMap, produkBaruIds, newStockIds, kategoriKomisiBekasMap, encumberedObjectIds, produkBaruObjectIds } =
    await prepareKatalogMatch(filters);

  // Default order: Produk Terbaru (the Produk Baru concept as a leading block, not a createdAt sort) -> Kategori -> Harga desc. Picking
  // "Harga: Terendah/Tertinggi" overrides all three: price becomes the only key below the tier.
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
      newStockIds,
      kategoriKomisiBekasMap,
      canEditProduct: opts.canEditProduct,
      canFlashSale: opts.canFlashSale,
    })
  );

  return { products, nextCursor: products.length === limit ? cursor + limit : null };
}

/** Every product in the Katalog's "New Stock" section, newest upload first. Unpaginated on purpose (only the last NEW_STOCK_DAYS days of uploads); same visibility rule and card shape as the grid. */
export async function queryNewStockProducts(opts: {
  canEditProduct?: boolean;
  canFlashSale?: boolean;
}): Promise<KatalogProduct[]> {
  const { statusMap, produkBaruIds, newStockIds, kategoriKomisiBekasMap } = await prepareKatalogMatch({});
  if (newStockIds.size === 0) return [];
  const ids = [...newStockIds].filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
  const docs = await Product.find({ _id: { $in: ids }, isCustom: { $ne: true }, stok: { $gt: 0 } })
    .sort({ createdAt: -1, _id: -1 })
    .lean();
  return docs.map((p) =>
    toKatalogProduct(p, {
      statusMap,
      produkBaruIds,
      newStockIds,
      kategoriKomisiBekasMap,
      canEditProduct: opts.canEditProduct,
      canFlashSale: opts.canFlashSale,
    })
  );
}

/**
 * Every id with real available stock (stok minus Booked/Sudah DP) matching the filters, unpaginated, for "Pilih Semua" (needs the full
 * matching set at once). Fetches only `_id`/`stok` to keep that cheap.
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
