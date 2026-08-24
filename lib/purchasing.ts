import { dbConnect } from "@/lib/db";
import { PurchaseOrder } from "@/models/PurchaseOrder";
import { PurchaseBill } from "@/models/PurchaseBill";
import { Product } from "@/models/Product";
import { getCurrentCashBalance } from "@/lib/keuangan";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface PurchasingSummary {
  poJalanCount: number;
  poJalanNilai: number;
  poTelatCount: number;
  poTelatNilai: number;
  perluDibeliCount: number;
}

/** The 4 stat cards atop the Purchasing dashboard — design "6a". */
export async function getPurchasingSummary(): Promise<PurchasingSummary> {
  await dbConnect();
  const menunggu = await PurchaseOrder.find({ status: "menunggu" }).lean();
  const now = Date.now();

  let poTelatCount = 0;
  let poTelatNilai = 0;
  for (const po of menunggu) {
    if (po.tanggalEstimasi && po.tanggalEstimasi.getTime() < now) {
      poTelatCount++;
      poTelatNilai += po.totalNilai;
    }
  }

  const perluDibeliCount = await Product.countDocuments({
    isCustom: { $ne: true },
    $expr: { $lt: ["$stok", "$stokMinimum"] },
  });

  return {
    poJalanCount: menunggu.length,
    poJalanNilai: menunggu.reduce((s, po) => s + po.totalNilai, 0),
    poTelatCount,
    poTelatNilai,
    perluDibeliCount,
  };
}

export interface PurchaseOrderRow {
  id: string;
  nomor: string;
  supplier: string;
  itemLabel: string;
  totalNilai: number;
  tanggalEstimasi?: Date;
  tanggalDiterima?: Date;
  hariTelat: number; // 0 if not late
}

function itemLabel(items: { namaSnapshot: string; qty: number }[]): string {
  return items.map((i) => `${i.namaSnapshot} ×${i.qty}`).join(", ");
}

/** POs still waiting on goods, soonest/most-overdue ETA first. */
export async function getPOsMenunggu(): Promise<PurchaseOrderRow[]> {
  await dbConnect();
  const rows = await PurchaseOrder.find({ status: "menunggu" }).sort({ tanggalEstimasi: 1 }).lean();
  const now = Date.now();

  return rows
    .map((po) => {
      const hariTelat =
        po.tanggalEstimasi && po.tanggalEstimasi.getTime() < now
          ? Math.floor((now - po.tanggalEstimasi.getTime()) / 86_400_000)
          : 0;
      return {
        id: String(po._id),
        nomor: po.nomor,
        supplier: po.supplier,
        itemLabel: itemLabel(po.items),
        totalNilai: po.totalNilai,
        tanggalEstimasi: po.tanggalEstimasi ?? undefined,
        hariTelat,
      };
    })
    .sort((a, b) => b.hariTelat - a.hariTelat); // most-late first, matching the mockup
}

/** POs marked received within the last 7 days. */
export async function getPOsDiterimaRecent(): Promise<PurchaseOrderRow[]> {
  await dbConnect();
  const since = new Date(Date.now() - SEVEN_DAYS_MS);
  const rows = await PurchaseOrder.find({ status: "diterima", tanggalDiterima: { $gte: since } })
    .sort({ tanggalDiterima: -1 })
    .lean();

  return rows.map((po) => ({
    id: String(po._id),
    nomor: po.nomor,
    supplier: po.supplier,
    itemLabel: itemLabel(po.items),
    totalNilai: po.totalNilai,
    tanggalDiterima: po.tanggalDiterima ?? undefined,
    hariTelat: 0,
  }));
}

export interface LowStockSuggestion {
  productId: string;
  nama: string;
  stok: number;
  stokMinimum: number;
  usulQty: number;
  supplierId?: string;
  supplierNama?: string;
  hargaSatuan: number;
  usulTotal: number;
}

/**
 * Products under their own stokMinimum, with a suggested restock qty
 * (brings stock back up to the minimum — deliberately not a fancier
 * buffer heuristic, see the user's mockup 2026-08-24) and the last
 * supplier/price used for that product, if any prior PO exists for it.
 */
export async function getLowStockSuggestions(): Promise<LowStockSuggestion[]> {
  await dbConnect();
  const products = await Product.find({
    isCustom: { $ne: true },
    $expr: { $lt: ["$stok", "$stokMinimum"] },
  })
    .sort({ stok: 1 })
    .lean();
  if (products.length === 0) return [];

  const productIds = products.map((p) => p._id);
  // Most recent PO line for each of these products, across any status —
  // just used to pre-fill a sensible supplier/price, not a status filter.
  const recentPOs = await PurchaseOrder.find({ "items.product": { $in: productIds } })
    .sort({ createdAt: -1 })
    .lean();

  const lastByProduct = new Map<string, { supplierId?: string; supplierNama: string; hargaSatuan: number }>();
  for (const po of recentPOs) {
    for (const item of po.items) {
      const key = String(item.product);
      if (!lastByProduct.has(key)) {
        lastByProduct.set(key, {
          supplierId: po.supplierRef ? String(po.supplierRef) : undefined,
          supplierNama: po.supplier,
          hargaSatuan: item.hargaSatuan,
        });
      }
    }
  }

  return products.map((p) => {
    const usulQty = Math.max(p.stokMinimum - p.stok, 1);
    const last = lastByProduct.get(String(p._id));
    const hargaSatuan = last?.hargaSatuan ?? p.hargaBeli ?? 0;
    return {
      productId: String(p._id),
      nama: p.name,
      stok: p.stok,
      stokMinimum: p.stokMinimum,
      usulQty,
      supplierId: last?.supplierId,
      supplierNama: last?.supplierNama,
      hargaSatuan,
      usulTotal: usulQty * hargaSatuan,
    };
  });
}

export interface BayarTagihanSummary {
  kasTersedia: number;
  jatuhTempo7HariCount: number;
  jatuhTempo7HariNilai: number;
  terlambatCount: number;
  terlambatNilai: number;
  totalHutangCount: number;
  totalHutangNilai: number;
}

/** The 4 stat cards atop Bayar Tagihan — design "6b". */
export async function getBayarTagihanSummary(): Promise<BayarTagihanSummary> {
  await dbConnect();
  const [kasTersedia, bills] = await Promise.all([
    getCurrentCashBalance(),
    PurchaseBill.find({ status: "belum_dibayar" }).lean(),
  ]);
  const now = Date.now();
  const in7Days = now + SEVEN_DAYS_MS;

  let jatuhTempo7HariCount = 0;
  let jatuhTempo7HariNilai = 0;
  let terlambatCount = 0;
  let terlambatNilai = 0;

  for (const b of bills) {
    const due = b.jatuhTempo?.getTime();
    if (due === undefined) continue;
    if (due < now) {
      terlambatCount++;
      terlambatNilai += b.totalTagihan;
    } else if (due <= in7Days) {
      jatuhTempo7HariCount++;
      jatuhTempo7HariNilai += b.totalTagihan;
    }
  }

  return {
    kasTersedia,
    jatuhTempo7HariCount,
    jatuhTempo7HariNilai,
    terlambatCount,
    terlambatNilai,
    totalHutangCount: bills.length,
    totalHutangNilai: bills.reduce((s, b) => s + b.totalTagihan, 0),
  };
}

export interface TagihanBerjalanRow {
  id: string;
  nomor: string;
  supplier: string;
  namaBarang: string;
  totalTagihan: number;
  jatuhTempo?: Date;
  hariTerlambat: number; // 0 if not overdue
  hariMenujuJatuhTempo: number; // 0 if overdue or no due date
}

/** Unpaid bills sorted by urgency — overdue first (worst first), then soonest due date, matching "6b". */
export async function getTagihanBerjalan(): Promise<TagihanBerjalanRow[]> {
  await dbConnect();
  const bills = await PurchaseBill.find({ status: "belum_dibayar" }).sort({ jatuhTempo: 1 }).lean();
  const now = Date.now();

  const rows = bills.map((b) => {
    const due = b.jatuhTempo?.getTime();
    const hariTerlambat = due !== undefined && due < now ? Math.floor((now - due) / 86_400_000) : 0;
    const hariMenujuJatuhTempo = due !== undefined && due >= now ? Math.ceil((due - now) / 86_400_000) : 0;
    return {
      id: String(b._id),
      nomor: b.nomor,
      supplier: b.supplier,
      namaBarang: b.namaBarang,
      totalTagihan: b.totalTagihan,
      jatuhTempo: b.jatuhTempo ?? undefined,
      hariTerlambat,
      hariMenujuJatuhTempo,
    };
  });

  return rows.sort((a, b) => {
    if (a.hariTerlambat !== b.hariTerlambat) return b.hariTerlambat - a.hariTerlambat; // most overdue first
    return a.hariMenujuJatuhTempo - b.hariMenujuJatuhTempo; // then soonest due
  });
}
