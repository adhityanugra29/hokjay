import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Sales } from "@/models/Sales";
import { User } from "@/models/User";

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

export interface SalesBoardRow {
  salesNama: string;
  totalPenjualan: number;
  orderCount: number;
  /** 0 = no target set on that sales's roster record — the board just skips the progress bar for them. */
  target: number;
  percent: number;
  lewatTarget: boolean;
  selisih: number;
}

export interface SalesBoard {
  rows: SalesBoardRow[];
  teamTotal: number;
  teamTarget: number;
  teamPercent: number;
  teamGap: number;
  daysRemaining: number;
}

/**
 * Powers the Leaderboard Sales board (design "5a" from the mockup doc the
 * user supplied 2026-08-24) — team-wide target progress + a countdown, then
 * each sales's own achievement against their individual target. Target is
 * Sales.targetBulanan (0 = not set, admin fills it in via Kelola User).
 */
export async function getSalesBoard(period: string): Promise<SalesBoard> {
  await dbConnect();
  const [invoices, salesDocs] = await Promise.all([
    getPaidInvoicesForPeriod(period),
    Sales.find({ aktif: true }).lean(),
  ]);
  const targetByNama = new Map(salesDocs.map((s) => [s.nama, s.targetBulanan ?? 0]));

  const map = new Map<string, { totalPenjualan: number; orderCount: number }>();
  for (const inv of invoices) {
    const nama = inv.sales?.nama ?? "—";
    const row = map.get(nama) ?? { totalPenjualan: 0, orderCount: 0 };
    row.totalPenjualan += inv.items.reduce((s, i) => s + i.subtotal, 0);
    row.orderCount += 1;
    map.set(nama, row);
  }

  const rows: SalesBoardRow[] = [...map.entries()]
    .map(([salesNama, r]) => {
      const target = targetByNama.get(salesNama) ?? 0;
      return {
        salesNama,
        totalPenjualan: r.totalPenjualan,
        orderCount: r.orderCount,
        target,
        percent: target > 0 ? Math.round((r.totalPenjualan / target) * 100) : 0,
        lewatTarget: target > 0 && r.totalPenjualan >= target,
        selisih: Math.abs(r.totalPenjualan - target),
      };
    })
    .sort((a, b) => b.totalPenjualan - a.totalPenjualan);

  const teamTotal = rows.reduce((s, r) => s + r.totalPenjualan, 0);
  const teamTarget = [...targetByNama.values()].reduce((s, t) => s + t, 0);
  const teamPercent = teamTarget > 0 ? Math.round((teamTotal / teamTarget) * 100) : 0;
  const teamGap = Math.max(0, teamTarget - teamTotal);

  const [y, m] = period.split("-").map(Number);
  const endOfMonth = new Date(y, m, 0);
  const daysRemaining = Math.max(0, Math.ceil((endOfMonth.getTime() - Date.now()) / 86_400_000));

  return { rows, teamTotal, teamTarget, teamPercent, teamGap, daysRemaining };
}

export interface MyCommissionTertahan {
  invoiceId: string;
  nomor: string;
  customerNama: string;
  hariBerjalan: number;
  komisi: number;
}

export interface MyCommissionSummary {
  period: string;
  /** Komisi from this period's already-paid invoices — safe, not contingent on the customer still paying. */
  sudahAman: number;
  /** Komisi from this period's still-unpaid invoices — only realized once the customer actually pays. */
  tertahan: number;
  totalBerjalan: number;
  tertahanInvoices: MyCommissionTertahan[];
}

/**
 * One sales's own commission for the period, split by what's already safe
 * (invoice paid) vs held up (invoice still unpaid) — powers "Komisi Saya"
 * (mobile "9b" mockup, 2026-08-26). Deliberately not the same split as
 * komisiCair (Payroll's own-been-disbursed-yet tracking) — this is about
 * whether the *customer* has paid, which is what actually determines
 * whether the commission is real yet from the sales rep's perspective.
 */
export async function getMyCommissionSummary(salesNama: string, period: string): Promise<MyCommissionSummary> {
  await dbConnect();
  const { start, end } = periodRange(period);
  const invoices = await Invoice.find({
    "sales.nama": salesNama,
    tanggalInvoice: { $gte: start, $lt: end },
    status: { $in: ["paid", "unpaid"] },
  }).sort({ tanggalInvoice: 1 });

  let sudahAman = 0;
  let tertahan = 0;
  const tertahanInvoices: MyCommissionTertahan[] = [];
  const now = Date.now();
  for (const inv of invoices) {
    const komisi = inv.items.reduce((s, i) => s + i.komisiSubtotal, 0);
    if (inv.status === "paid") {
      sudahAman += komisi;
    } else {
      tertahan += komisi;
      const baseDate = inv.tanggalInvoice ?? inv.get("createdAt");
      tertahanInvoices.push({
        invoiceId: String(inv._id),
        nomor: inv.nomor,
        customerNama: inv.customer?.nama ?? "—",
        hariBerjalan: Math.max(0, Math.floor((now - new Date(baseDate).getTime()) / 86_400_000)),
        komisi,
      });
    }
  }
  tertahanInvoices.sort((a, b) => b.hariBerjalan - a.hariBerjalan);

  return { period, sudahAman, tertahan, totalBerjalan: sudahAman + tertahan, tertahanInvoices };
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
/**
 * Login accounts with the "owner" role, by nama — a Sales roster entry
 * sharing that exact name is the Owner's own name matching how they show
 * up as a "sales" on old invoices, not a real commission-earning rep. Per
 * the user's request 2026-09-04 ("andi abdillah di payroll, tidak perlu
 * ada komisinya (karena dia owner)"): scoped to role, not the one name, so
 * it keeps holding if the Owner account is ever renamed or a second Owner
 * account is added.
 */
async function getOwnerNames(): Promise<Set<string>> {
  const owners = await User.find({ role: "owner" }).select("nama").lean();
  return new Set(owners.map((o) => o.nama));
}

export async function getUnpaidCommissionBySales(): Promise<UnpaidCommissionSales[]> {
  await dbConnect();
  const [invoices, ownerNames] = await Promise.all([
    Invoice.find({ status: "paid", komisiCair: false }),
    getOwnerNames(),
  ]);
  const map = new Map<string, UnpaidCommissionSales>();

  for (const inv of invoices) {
    const nama = inv.sales?.nama ?? "—";
    if (ownerNames.has(nama)) continue;
    const total = inv.items.reduce((s, i) => s + i.komisiSubtotal, 0);
    if (total <= 0) continue;
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
  const ownerNames = await getOwnerNames();
  if (ownerNames.has(salesNama)) return [];
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

