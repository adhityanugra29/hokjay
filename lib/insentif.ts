import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Sales } from "@/models/Sales";
import { User } from "@/models/User";
import { jakartaMonthRange, jakartaYearRange } from "@/lib/timezone";

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
  /**
   * Sum of item subtotals from this period's DP'd or plain-unpaid invoices
   * (status "unpaid", either way — not yet fully paid) for this sales,
   * shown as a small "+ Estimasi" line under the confirmed totalPenjualan.
   * Never affects ranking/sort/target-progress — those stay Lunas-only.
   * Deliberately does NOT include a commission figure (komisi) alongside
   * this — per the user's explicit correction 2026-09-19 ("saya lupa itu
   * privasi"): a sales rep's commission is private, not something to show
   * on a leaderboard every other sales can see.
   */
  estimasiSales: number;
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
 * This period's DP'd or plain-unpaid invoices (status "unpaid" either
 * way — not yet fully paid), bucketed by tanggalInvoice since they have
 * no payment.tanggalBayar yet to bucket by. Feeds getSalesBoard's
 * "Estimasi Sales" line — per the user's request 2026-09-19 ("estimasi
 * sales dan insentif, angkanya dari yang sudah DP dan yang belum
 * lunas").
 */
async function getUnpaidInvoicesForPeriod(period: string) {
  await dbConnect();
  const { start, end } = periodRange(period);
  return Invoice.find({
    status: "unpaid",
    tanggalInvoice: { $gte: start, $lt: end },
  });
}

/**
 * Powers the Leaderboard Sales board (design "5a" from the mockup doc the
 * user supplied 2026-08-24) — team-wide target progress + a countdown, then
 * each sales's own achievement against their individual target. Target is
 * Sales.targetBulanan (0 = not set, admin fills it in via Kelola User).
 *
 * "Estimasi Sales" (2026-09-19) — a second, smaller figure per row from
 * this period's DP'd/unpaid invoices, previewed with the user as an HTML
 * mockup before building. Deliberately does NOT affect ranking, the
 * target-progress bar, or which sales sorts to the highlighted #1 spot —
 * all of that stays exactly as before, Lunas-only. A sales with unpaid
 * invoices but zero Lunas ones yet still gets a row (totalPenjualan 0,
 * estimasiSales > 0) rather than being left off the board entirely.
 */
export async function getSalesBoard(period: string): Promise<SalesBoard> {
  await dbConnect();
  const [invoices, unpaidInvoices, salesDocs] = await Promise.all([
    getPaidInvoicesForPeriod(period),
    getUnpaidInvoicesForPeriod(period),
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

  const estimasiByNama = new Map<string, number>();
  for (const inv of unpaidInvoices) {
    const nama = inv.sales?.nama ?? "—";
    const subtotal = inv.items.reduce((s, i) => s + i.subtotal, 0);
    estimasiByNama.set(nama, (estimasiByNama.get(nama) ?? 0) + subtotal);
  }

  // Union of both sets of names — a sales with only unpaid invoices this
  // period (no Lunas yet) still gets a row, per the user's confirmed
  // default while planning this feature.
  const allNama = new Set([...map.keys(), ...estimasiByNama.keys()]);

  const rows: SalesBoardRow[] = [...allNama]
    .map((salesNama) => {
      const r = map.get(salesNama) ?? { totalPenjualan: 0, orderCount: 0 };
      const target = targetByNama.get(salesNama) ?? 0;
      return {
        salesNama,
        totalPenjualan: r.totalPenjualan,
        orderCount: r.orderCount,
        target,
        percent: target > 0 ? Math.round((r.totalPenjualan / target) * 100) : 0,
        lewatTarget: target > 0 && r.totalPenjualan >= target,
        selisih: Math.abs(r.totalPenjualan - target),
        estimasiSales: estimasiByNama.get(salesNama) ?? 0,
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

/** One invoice row on Komisi Saya. Dates are ISO strings so the whole overview can cross into a client component. */
export interface MyKomisiInvoiceRow {
  invoiceId: string;
  nomor: string;
  customerNama: string;
  komisi: number;
  /** Payment state of the invoice itself: "dp" = still "unpaid" but a DP was already received. */
  status: "unpaid" | "dp" | "paid";
  /** Still owed on the invoice (grandTotal - DP). Only meaningful for unpaid/dp. */
  sisaTagihan: number;
  /** Days since tanggalInvoice. Only meaningful for unpaid/dp. */
  hariBerjalan: number;
  /** When the customer fully paid. Only for paid. */
  tanggalLunas?: string;
  /** "YYYY-MM" when this row belongs to an earlier month than the selected one (a carry-over). */
  asalPeriode?: string;
}

export interface MyKomisiPayoutRow {
  key: string;
  tanggalBayar: string;
  total: number;
  catatan?: string;
  buktiUrl?: string;
  invoices: { invoiceId: string; nomor: string; customerNama: string; tanggalLunas: string; komisi: number }[];
}

export interface MyKomisiOverview {
  period: string;
  tahun: number;
  /** Lunas this period, company hasn't transferred the commission yet. */
  siapCair: number;
  /** Same as siapCair but from earlier months, still waiting — kept out of siapCair so the period figure stays period-only. */
  siapCairBulanLalu: number;
  /** Lunas this period AND already transferred to the sales rep. */
  sudahDibayar: number;
  sudahDibayarCount: number;
  /** What the hero shows: commission from invoices that are fully paid (lunas) this period. */
  totalLunas: number;
  /** Not counted in totalLunas — customer hasn't fully paid yet. Spans every month up to the selected one. */
  belumLunasTotal: number;
  siapCairInvoices: MyKomisiInvoiceRow[];
  belumLunasInvoices: MyKomisiInvoiceRow[];
  /** Transfers received during the selected month (by komisiCairTanggal), newest first. */
  payouts: MyKomisiPayoutRow[];
  /** Everything received in the selected period's calendar year. */
  totalDiterimaTahun: number;
}

/**
 * Komisi Saya's data (redesign 2026-10-01, mockup-approved). The headline
 * figure is commission from invoices that are *lunas* — per the user's
 * correction ("fokuskan angka terbesarnya hanya ke komisi dari invoice yang
 * sudah lunas"), the old "Komisi berjalan" also summed still-unpaid
 * invoices, which read as money already earned. Unpaid-invoice commission
 * is returned separately (belumLunas*) and never added into totalLunas.
 *
 * Period basis: lunas rows by when the customer paid (payment.tanggalBayar —
 * same basis as the Leaderboard), unpaid rows by tanggalInvoice (they have
 * no payment date yet). Both "waiting" lists carry over from earlier months
 * on purpose: an unpaid / not-yet-transferred invoice from September must
 * not vanish from the October view (the old summary dropped it). Month
 * boundaries are GMT+7 (lib/timezone.ts), not server-local time.
 *
 * Payouts are re-grouped from Invoice.komisiCair* the same way
 * getPayrollHistory does (sales + komisiCairTanggal + bukti identify one
 * batch) — there's no dedicated payout record — but scoped to one sales.
 */
export async function getMyKomisiOverview(salesNama: string, period: string): Promise<MyKomisiOverview> {
  await dbConnect();
  const [y, m] = period.split("-").map(Number);
  const { from: start, to: end } = jakartaMonthRange(y, m);
  const { from: yearStart, to: yearEnd } = jakartaYearRange(y);

  const [dibayarInvoices, siapInvoices, belumInvoices, yearPayouts] = await Promise.all([
    Invoice.find({
      "sales.nama": salesNama,
      status: "paid",
      komisiCair: true,
      "payment.tanggalBayar": { $gte: start, $lt: end },
    }).lean(),
    Invoice.find({
      "sales.nama": salesNama,
      status: "paid",
      komisiCair: { $ne: true },
      "payment.tanggalBayar": { $lt: end },
    }).lean(),
    Invoice.find({
      "sales.nama": salesNama,
      status: "unpaid",
      tanggalInvoice: { $lt: end },
    }).lean(),
    Invoice.find({
      "sales.nama": salesNama,
      komisiCair: true,
      komisiCairTanggal: { $gte: yearStart, $lt: yearEnd },
    }).lean(),
  ]);

  const komisiOf = (inv: { items: { komisiSubtotal: number }[] }) =>
    inv.items.reduce((s, i) => s + i.komisiSubtotal, 0);
  const periodKey = (d: Date) => {
    const j = new Date(d.getTime() + 7 * 60 * 60 * 1000);
    return `${j.getUTCFullYear()}-${String(j.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  const now = Date.now();

  let sudahDibayar = 0;
  let sudahDibayarCount = 0;
  for (const inv of dibayarInvoices) {
    const komisi = komisiOf(inv);
    if (komisi <= 0) continue;
    sudahDibayar += komisi;
    sudahDibayarCount++;
  }

  let siapCair = 0;
  let siapCairBulanLalu = 0;
  const siapCairInvoices: MyKomisiInvoiceRow[] = [];
  for (const inv of siapInvoices) {
    const komisi = komisiOf(inv);
    if (komisi <= 0) continue;
    const lunasAt = inv.payment?.tanggalBayar ?? inv.tanggalInvoice;
    const carried = lunasAt < start;
    if (carried) siapCairBulanLalu += komisi;
    else siapCair += komisi;
    siapCairInvoices.push({
      invoiceId: String(inv._id),
      nomor: inv.nomor,
      customerNama: inv.customer?.nama ?? "—",
      komisi,
      status: "paid",
      sisaTagihan: 0,
      hariBerjalan: 0,
      tanggalLunas: lunasAt.toISOString(),
      asalPeriode: carried ? periodKey(lunasAt) : undefined,
    });
  }
  siapCairInvoices.sort((a, b) => b.tanggalLunas!.localeCompare(a.tanggalLunas!));

  let belumLunasTotal = 0;
  const belumLunasInvoices: MyKomisiInvoiceRow[] = [];
  for (const inv of belumInvoices) {
    const komisi = komisiOf(inv);
    if (komisi <= 0) continue;
    belumLunasTotal += komisi;
    const dp = inv.dp?.nominal ?? 0;
    belumLunasInvoices.push({
      invoiceId: String(inv._id),
      nomor: inv.nomor,
      customerNama: inv.customer?.nama ?? "—",
      komisi,
      status: dp > 0 ? "dp" : "unpaid",
      sisaTagihan: Math.max(0, inv.grandTotal - dp),
      hariBerjalan: Math.max(0, Math.floor((now - inv.tanggalInvoice.getTime()) / 86_400_000)),
      asalPeriode: inv.tanggalInvoice < start ? periodKey(inv.tanggalInvoice) : undefined,
    });
  }
  belumLunasInvoices.sort((a, b) => b.hariBerjalan - a.hariBerjalan);

  const batches = new Map<string, MyKomisiPayoutRow>();
  let totalDiterimaTahun = 0;
  for (const inv of yearPayouts) {
    const komisi = komisiOf(inv);
    if (komisi <= 0) continue;
    totalDiterimaTahun += komisi;
    const tanggal = inv.komisiCairTanggal!;
    if (tanggal < start || tanggal >= end) continue;
    const key = `${tanggal.getTime()}|${inv.komisiCairBuktiUrl ?? ""}`;
    let row = batches.get(key);
    if (!row) {
      row = {
        key,
        tanggalBayar: tanggal.toISOString(),
        total: 0,
        catatan: inv.komisiCairCatatan ?? undefined,
        buktiUrl: inv.komisiCairBuktiUrl ?? undefined,
        invoices: [],
      };
      batches.set(key, row);
    }
    row.total += komisi;
    row.invoices.push({
      invoiceId: String(inv._id),
      nomor: inv.nomor,
      customerNama: inv.customer?.nama ?? "—",
      tanggalLunas: (inv.payment?.tanggalBayar ?? tanggal).toISOString(),
      komisi,
    });
  }
  const payouts = [...batches.values()].sort((a, b) => b.tanggalBayar.localeCompare(a.tanggalBayar));

  return {
    period,
    tahun: y,
    siapCair,
    siapCairBulanLalu,
    sudahDibayar,
    sudahDibayarCount,
    totalLunas: siapCair + sudahDibayar,
    belumLunasTotal,
    siapCairInvoices,
    belumLunasInvoices,
    payouts,
    totalDiterimaTahun,
  };
}

