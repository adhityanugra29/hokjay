import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Product } from "@/models/Product";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";

export type HotBadge = "terlaris" | "stok" | "insentif";

export interface HotProduct {
  _id: string;
  name: string;
  fotoUrl?: string;
  hargaRekomendasi: number;
  stok: number;
  komisiNominal: number;
  terjualBulanIni: number;
  badges: HotBadge[];
}

/**
 * Dashboard's "Hot Products" carousel — a single merged list built from
 * three separate rankings (best-selling this month, most stock on hand,
 * highest incentive), each product tagged with every badge it qualifies
 * for. See confirmation with the user 2026-08-20.
 */
export async function getHotProducts(range: { from: Date; to: Date }, limit = 5): Promise<HotProduct[]> {
  await dbConnect();

  const paidInvoices = await Invoice.find({
    status: "paid",
    "payment.tanggalBayar": { $gte: range.from, $lt: range.to },
  });
  const qtyMap = new Map<string, number>();
  for (const inv of paidInvoices) {
    for (const item of inv.items) {
      if (!item.product) continue; // custom-order items have no backing Product
      const key = String(item.product);
      qtyMap.set(key, (qtyMap.get(key) ?? 0) + item.qty);
    }
  }
  const terlarisIds = [...qtyMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  const [terlarisProducts, stokTop, komisiTop] = await Promise.all([
    Product.find({ _id: { $in: terlarisIds } }).lean(),
    Product.find({ isCustom: { $ne: true } }).sort({ stok: -1 }).limit(limit).lean(),
    Product.find({ isCustom: { $ne: true } }).sort({ komisiNominal: -1 }).limit(limit).lean(),
  ]);

  const map = new Map<string, HotProduct>();
  function ensure(p: (typeof stokTop)[number]): HotProduct {
    const id = String(p._id);
    let entry = map.get(id);
    if (!entry) {
      entry = {
        _id: id,
        name: p.name,
        fotoUrl: p.fotoUrl ?? undefined,
        hargaRekomendasi: p.hargaRekomendasi,
        stok: p.stok,
        komisiNominal: p.komisiNominal,
        terjualBulanIni: qtyMap.get(id) ?? 0,
        badges: [],
      };
      map.set(id, entry);
    }
    return entry;
  }

  for (const p of terlarisProducts) ensure(p).badges.push("terlaris");
  for (const p of stokTop) ensure(p).badges.push("stok");
  for (const p of komisiTop) ensure(p).badges.push("insentif");

  return [...map.values()].sort(
    (a, b) => b.badges.length - a.badges.length || b.terjualBulanIni - a.terjualBulanIni
  );
}

export interface FollowUpInvoiceRow {
  invoiceId: string;
  nomor: string;
  status: "draft" | "unpaid";
  customerNama: string;
  salesNama: string;
  grandTotal: number;
  komisiPotensial: number;
  hariBerjalan: number;
}

export interface FollowUpSalesSummary {
  salesNama: string;
  invoiceCount: number;
  totalNilai: number;
  totalKomisiPotensial: number;
}

/**
 * Every invoice still needing follow-up (draft or unpaid — not just the
 * dashboard widget's 6-row teaser), with the commission each one would earn
 * once paid and cair. komisiSubtotal is already snapshotted on every item at
 * creation time regardless of draft/unpaid (see lib/services/createInvoice.ts
 * — only stock/journal posting is gated behind finalize), so summing it here
 * is safe even for drafts. See confirmation with the user 2026-08-21.
 */
export async function getFollowUpInvoices(): Promise<FollowUpInvoiceRow[]> {
  await dbConnect();
  const invoices = await Invoice.find({ status: { $in: ["unpaid", "draft"] } }).sort({ createdAt: 1 });

  return invoices.map((inv) => {
    const komisiPotensial = inv.items.reduce((s, i) => s + i.komisiSubtotal, 0);
    const baseDate = inv.status === "draft" ? inv.get("createdAt") : (inv.tanggalInvoice ?? inv.get("createdAt"));
    const hariBerjalan = Math.max(0, Math.floor((Date.now() - new Date(baseDate).getTime()) / 86_400_000));
    return {
      invoiceId: String(inv._id),
      nomor: inv.nomor,
      status: inv.status as "draft" | "unpaid",
      customerNama: inv.customer?.nama || "—",
      salesNama: inv.sales?.nama ?? "—",
      grandTotal: inv.grandTotal,
      komisiPotensial,
      hariBerjalan,
    };
  });
}

export interface LowStockProduct {
  _id: string;
  name: string;
  stok: number;
}

/** Products at or below LOW_STOCK_THRESHOLD — powers Beranda's "Perlu ditindak" stok-tipis row. */
export async function getLowStockProducts(limit = 3): Promise<LowStockProduct[]> {
  await dbConnect();
  const products = await Product.find({ stok: { $lte: LOW_STOCK_THRESHOLD }, isCustom: { $ne: true } })
    .sort({ stok: 1 })
    .limit(limit)
    .lean();
  return products.map((p) => ({ _id: String(p._id), name: p.name, stok: p.stok }));
}

/** Total count of low-stock products (not just the capped preview list). */
export async function countLowStockProducts(): Promise<number> {
  await dbConnect();
  return Product.countDocuments({ stok: { $lte: LOW_STOCK_THRESHOLD }, isCustom: { $ne: true } });
}

export function summarizeFollowUpBySales(rows: FollowUpInvoiceRow[]): FollowUpSalesSummary[] {
  const map = new Map<string, FollowUpSalesSummary>();
  for (const r of rows) {
    const row = map.get(r.salesNama) ?? {
      salesNama: r.salesNama,
      invoiceCount: 0,
      totalNilai: 0,
      totalKomisiPotensial: 0,
    };
    row.invoiceCount++;
    row.totalNilai += r.grandTotal;
    row.totalKomisiPotensial += r.komisiPotensial;
    map.set(r.salesNama, row);
  }
  return [...map.values()].sort((a, b) => b.totalKomisiPotensial - a.totalKomisiPotensial);
}
