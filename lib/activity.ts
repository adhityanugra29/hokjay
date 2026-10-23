import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Product } from "@/models/Product";

/**
 * Activity feed for the Beranda bell/notification button — confirmed with
 * the user 2026-08-22 to be a real log ("pembayaran invoice sudah lunas,
 * ada penambahan item baru, komisi sudah dibayarkan"), not just a redirect
 * to /follow-up. Deliberately synthesized on read from existing
 * already-timestamped events (Invoice.payment.tanggalBayar,
 * Invoice.komisiCairTanggal, Product.createdAt) rather than a new
 * persisted log collection — every event type here already has a real
 * timestamp sitting on an existing document, so a write-side logging pass
 * touching every mutation site in the app isn't needed to get this right.
 */
export type ActivityType = "invoice-lunas" | "produk-baru" | "komisi-cair" | "flash-sale";

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  tanggal: Date;
  title: string;
  detail: string;
  href: string;
}

export async function getActivityLog(limit = 50): Promise<ActivityEntry[]> {
  await dbConnect();

  const [paidInvoices, cairInvoices, newProducts, flashSaleProducts] = await Promise.all([
    Invoice.find({ status: "paid" })
      .sort({ "payment.tanggalBayar": -1 })
      .limit(limit)
      .lean(),
    Invoice.find({ komisiCair: true })
      .sort({ komisiCairTanggal: -1 })
      .limit(limit)
      .lean(),
    Product.find({ isCustom: { $ne: true } }).sort({ createdAt: -1 }).limit(limit).lean(),
    // Flash Sale activations — per the user's request 2026-08-29. Reads
    // straight off Product.flashSale.setAt (already a real timestamp),
    // same "synthesize from an existing field" approach as the other
    // entries here rather than a separate write-side log.
    Product.find({ "flashSale.active": true, "flashSale.setAt": { $exists: true } })
      .sort({ "flashSale.setAt": -1 })
      .limit(limit)
      .lean(),
  ]);

  const entries: ActivityEntry[] = [];

  for (const inv of paidInvoices) {
    const tanggal = inv.payment?.tanggalBayar ?? inv.updatedAt ?? inv.createdAt;
    if (!tanggal) continue;
    entries.push({
      id: `invoice-lunas-${inv._id}`,
      type: "invoice-lunas",
      tanggal: new Date(tanggal),
      title: `Invoice ${inv.nomor} sudah lunas`,
      detail: `${inv.customer?.nama ?? "—"} · ${new Intl.NumberFormat("id-ID").format(inv.grandTotal)}`,
      href: `/invoice/${inv._id}`,
    });
  }

  for (const inv of cairInvoices) {
    if (!inv.komisiCairTanggal) continue;
    const komisi = inv.items.reduce((s: number, i: { komisiSubtotal: number }) => s + i.komisiSubtotal, 0);
    entries.push({
      id: `komisi-cair-${inv._id}`,
      type: "komisi-cair",
      tanggal: new Date(inv.komisiCairTanggal),
      title: `Komisi sales sudah dibayarkan`,
      detail: `${inv.sales?.nama ?? "—"} · invoice ${inv.nomor} · ${new Intl.NumberFormat("id-ID").format(komisi)}`,
      href: `/invoice/${inv._id}`,
    });
  }

  for (const p of newProducts) {
    if (!p.createdAt) continue;
    entries.push({
      id: `produk-baru-${p._id}`,
      type: "produk-baru",
      tanggal: new Date(p.createdAt),
      title: `Produk baru ditambahkan`,
      detail: p.name,
      // Goes to Katalog, not the edit page — per the user's bug report
      // 2026-09-07 ("kenapa pada saat produk baru ditambahkan larinya ke
      // edit? harusnya ke katalog ya"). Matches the Flash Sale entry's own
      // href just below, which already did this correctly.
      href: `/katalog`,
    });
  }

  for (const p of flashSaleProducts) {
    if (!p.flashSale?.setAt) continue;
    entries.push({
      id: `flash-sale-${p._id}`,
      type: "flash-sale",
      tanggal: new Date(p.flashSale.setAt),
      title: `Flash Sale diaktifkan`,
      detail: `${p.name} · ${new Intl.NumberFormat("id-ID").format(p.flashSale.harga ?? 0)} · oleh ${p.flashSale.setBy ?? "—"}`,
      href: `/katalog`,
    });
  }

  return entries.sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime()).slice(0, limit);
}

/**
 * How many activity entries fall in the last 24 hours (capped at `limit`, like the feed itself) — Beranda's bell badge only needs this number, so it counts with
 * four cheap queries instead of building the whole merged feed. Mirrors getActivityLog's four sources and its date rules (a paid invoice without
 * payment.tanggalBayar counts by updatedAt; komisi-cair needs komisiCairTanggal).
 */
export async function getRecentActivityCount(limit = 50): Promise<number> {
  await dbConnect();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [paid, cair, newProducts, flashSale] = await Promise.all([
    Invoice.countDocuments({
      status: "paid",
      $or: [
        { "payment.tanggalBayar": { $gte: since } },
        { "payment.tanggalBayar": { $exists: false }, updatedAt: { $gte: since } },
      ],
    }),
    Invoice.countDocuments({ komisiCair: true, komisiCairTanggal: { $gte: since } }),
    Product.countDocuments({ isCustom: { $ne: true }, createdAt: { $gte: since } }),
    Product.countDocuments({ "flashSale.active": true, "flashSale.setAt": { $gte: since } }),
  ]);
  return Math.min(limit, paid + cair + newProducts + flashSale);
}
