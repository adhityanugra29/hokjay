import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";

export function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function periodRange(period: string) {
  const [y, m] = period.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  return { start, end };
}

export interface SalesRanking {
  salesNama: string;
  qty: number;
  totalPenjualan: number;
  totalKomisi: number;
  itemCount: number;
  komisiCairCount: number;
  komisiBelumCairCount: number;
}

/** Paid invoices within [period]'s month, bucketed by their payment date. */
export async function getPaidInvoicesForPeriod(period: string) {
  await dbConnect();
  const { start, end } = periodRange(period);
  return Invoice.find({
    status: "paid",
    "payment.tanggalBayar": { $gte: start, $lt: end },
  }).sort({ "payment.tanggalBayar": -1 });
}

export async function getSalesRanking(period: string): Promise<SalesRanking[]> {
  const invoices = await getPaidInvoicesForPeriod(period);
  const map = new Map<string, SalesRanking>();

  for (const inv of invoices) {
    const nama = inv.sales?.nama ?? "—";
    const row = map.get(nama) ?? {
      salesNama: nama,
      qty: 0,
      totalPenjualan: 0,
      totalKomisi: 0,
      itemCount: 0,
      komisiCairCount: 0,
      komisiBelumCairCount: 0,
    };
    for (const item of inv.items) {
      row.qty += item.qty;
      row.totalPenjualan += item.subtotal;
      row.totalKomisi += item.komisiSubtotal;
    }
    if (inv.komisiCair) row.komisiCairCount++;
    else row.komisiBelumCairCount++;
    map.set(nama, row);
  }

  return [...map.values()].sort((a, b) => b.totalKomisi - a.totalKomisi);
}

export interface ProdukKomisi {
  namaProduk: string;
  komisiPerItem: number;
  totalTerjual: number;
  totalKomisi: number;
}

export async function getKomisiPerProduk(period: string): Promise<ProdukKomisi[]> {
  const invoices = await getPaidInvoicesForPeriod(period);
  const map = new Map<string, ProdukKomisi>();

  for (const inv of invoices) {
    for (const item of inv.items) {
      if (item.isCustom) continue;
      const row = map.get(item.namaSnapshot) ?? {
        namaProduk: item.namaSnapshot,
        komisiPerItem: item.komisiPerItemSnapshot,
        totalTerjual: 0,
        totalKomisi: 0,
      };
      row.totalTerjual += item.qty;
      row.totalKomisi += item.komisiSubtotal;
      map.set(item.namaSnapshot, row);
    }
  }

  return [...map.values()].sort((a, b) => b.totalKomisi - a.totalKomisi);
}

export interface UnpaidCommissionSales {
  salesNama: string;
  invoiceCount: number;
  totalKomisi: number;
}

/**
 * Outstanding ("belum cair") commission grouped by sales — not scoped to a
 * period, since Admin needs to see everything still owed regardless of
 * when it was earned. Backs the /payroll landing page's Komisi tab (moved
 * from the standalone /bayar-komisi 2026-08-23).
 */
export async function getUnpaidCommissionBySales(): Promise<UnpaidCommissionSales[]> {
  await dbConnect();
  const invoices = await Invoice.find({ status: "paid", komisiCair: false });
  const map = new Map<string, UnpaidCommissionSales>();

  for (const inv of invoices) {
    const total = inv.items.reduce((s, i) => s + i.komisiSubtotal, 0);
    if (total <= 0) continue;
    const nama = inv.sales?.nama ?? "—";
    const row = map.get(nama) ?? { salesNama: nama, invoiceCount: 0, totalKomisi: 0 };
    row.invoiceCount++;
    row.totalKomisi += total;
    map.set(nama, row);
  }

  return [...map.values()].sort((a, b) => b.totalKomisi - a.totalKomisi);
}

export interface UnpaidCommissionInvoice {
  invoiceId: string;
  nomor: string;
  tanggalLunas: Date;
  itemLabel: string;
  komisiTotal: number;
}

/** One sales's outstanding commission invoices — the checkbox list on /payroll/komisi/[nama]. */
export async function getUnpaidCommissionInvoices(salesNama: string): Promise<UnpaidCommissionInvoice[]> {
  await dbConnect();
  const invoices = await Invoice.find({ status: "paid", komisiCair: false, "sales.nama": salesNama }).sort({
    "payment.tanggalBayar": 1,
  });

  return invoices
    .map((inv) => {
      const items = inv.items.filter((i) => i.komisiSubtotal > 0);
      return {
        invoiceId: String(inv._id),
        nomor: inv.nomor,
        tanggalLunas: inv.payment?.tanggalBayar ?? inv.get("createdAt"),
        itemLabel: items.map((i) => `${i.namaSnapshot} x${i.qty}`).join(", "),
        komisiTotal: items.reduce((s, i) => s + i.komisiSubtotal, 0),
      };
    })
    .filter((r) => r.komisiTotal > 0);
}

export interface RiwayatKomisiRow {
  invoiceId: string;
  nomor: string;
  salesNama: string;
  itemLabel: string;
  komisiBaris: number;
  tanggalLunas: Date;
  komisiCair: boolean;
  komisiCairBuktiUrl?: string;
}

export async function getRiwayatKomisi(period: string): Promise<RiwayatKomisiRow[]> {
  const invoices = await getPaidInvoicesForPeriod(period);
  const rows: RiwayatKomisiRow[] = [];

  for (const inv of invoices) {
    const items = inv.items.filter((i) => !i.isCustom && i.komisiSubtotal > 0);
    if (items.length === 0) continue;
    const itemLabel = items.map((i) => `${i.namaSnapshot} x${i.qty}`).join(", ");
    const komisiBaris = items.reduce((s, i) => s + i.komisiSubtotal, 0);
    rows.push({
      invoiceId: String(inv._id),
      nomor: inv.nomor,
      salesNama: inv.sales?.nama ?? "—",
      itemLabel,
      komisiBaris,
      tanggalLunas: inv.payment!.tanggalBayar!,
      komisiCair: inv.komisiCair ?? false,
      komisiCairBuktiUrl: inv.komisiCairBuktiUrl ?? undefined,
    });
  }

  return rows;
}
