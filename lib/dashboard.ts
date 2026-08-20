import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Product } from "@/models/Product";

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
