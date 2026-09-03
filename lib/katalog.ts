import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Product } from "@/models/Product";
import { StockMovement } from "@/models/StockMovement";
import { Category } from "@/models/Category";
import { PRODUK_BARU_DAYS } from "@/lib/constants";

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
