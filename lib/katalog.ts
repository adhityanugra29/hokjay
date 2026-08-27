import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";

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
 */
export async function getProductInvoiceStatusMap(): Promise<Map<string, ProductInvoiceStatus>> {
  await dbConnect();

  const [unpaidInvoices, paidInvoices] = await Promise.all([
    Invoice.find({ status: "unpaid" }, { items: 1, dp: 1, sales: 1 }).lean(),
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
