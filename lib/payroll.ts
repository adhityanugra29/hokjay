import { dbConnect } from "@/lib/db";
import { Sales } from "@/models/Sales";
import { Karyawan } from "@/models/Karyawan";
import { Absensi } from "@/models/Absensi";
import { GajiPayment } from "@/models/GajiPayment";
import { Invoice } from "@/models/Invoice";
import { currentPeriod } from "@/lib/insentif";

export { currentPeriod };

function periodRange(periode: string) {
  const [y, m] = periode.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  return { start, end };
}

export interface GajiSalesRow {
  salesId: string;
  nama: string;
  bank?: string;
  nomorRekening?: string;
  rekeningTerverifikasi: boolean;
  gajiPokok: number;
  sudahDibayar: boolean;
  tanggalDibayar?: Date;
}

/** Sales tetap (gaji pokok bulanan) and whether that period's gaji has been paid yet. */
export async function getGajiSalesSummary(periode: string): Promise<GajiSalesRow[]> {
  await dbConnect();
  const [salesTetap, payments] = await Promise.all([
    Sales.find({ statusKepegawaian: "tetap", aktif: true }).sort({ nama: 1 }).lean(),
    GajiPayment.find({ tipe: "gaji-sales", periode }).lean(),
  ]);
  const paidBySalesId = new Map(payments.map((p) => [String(p.sales), p]));

  return salesTetap.map((s) => {
    const paid = paidBySalesId.get(String(s._id));
    return {
      salesId: String(s._id),
      nama: s.nama,
      bank: s.bank ?? undefined,
      nomorRekening: s.nomorRekening ?? undefined,
      rekeningTerverifikasi: s.rekeningTerverifikasi ?? false,
      gajiPokok: s.gajiPokok ?? 0,
      sudahDibayar: !!paid,
      tanggalDibayar: paid?.tanggalBayar,
    };
  });
}

export interface GajiKaryawanRow {
  karyawanId: string;
  nama: string;
  jabatan?: string;
  gajiHarian: number;
  hariHadir: number;
  totalGaji: number;
  sudahDibayar: boolean;
  tanggalDibayar?: Date;
}

/** Aktif karyawan's attendance count and computed gaji for the period, plus paid status. */
export async function getKaryawanGajiSummary(periode: string): Promise<GajiKaryawanRow[]> {
  await dbConnect();
  const { start, end } = periodRange(periode);
  const [karyawanList, absensiRows, payments] = await Promise.all([
    Karyawan.find({ aktif: true }).sort({ nama: 1 }).lean(),
    Absensi.find({ tanggal: { $gte: start, $lt: end } }).lean(),
    GajiPayment.find({ tipe: "gaji-karyawan", periode }).lean(),
  ]);

  const hadirCountByKaryawan = new Map<string, number>();
  for (const a of absensiRows) {
    const key = String(a.karyawan);
    hadirCountByKaryawan.set(key, (hadirCountByKaryawan.get(key) ?? 0) + 1);
  }
  const paidByKaryawanId = new Map(payments.map((p) => [String(p.karyawan), p]));

  return karyawanList.map((k) => {
    const hariHadir = hadirCountByKaryawan.get(String(k._id)) ?? 0;
    const paid = paidByKaryawanId.get(String(k._id));
    return {
      karyawanId: String(k._id),
      nama: k.nama,
      jabatan: k.jabatan ?? undefined,
      gajiHarian: k.gajiHarian,
      hariHadir,
      totalGaji: hariHadir * k.gajiHarian,
      sudahDibayar: !!paid,
      tanggalDibayar: paid?.tanggalBayar,
    };
  });
}

export interface GajiBulananRow {
  tipe: "sales" | "karyawan";
  id: string;
  nama: string;
  /** Sales: "{bank} · {rekening}" or "belum diisi". Karyawan: jabatan + hari hadir. */
  subtitle: string;
  jumlah: number;
  /** Sales: rekening sudah diverifikasi. Karyawan: ada gaji > 0 untuk dibayar. */
  siapBayar: boolean;
  sudahDibayar: boolean;
}

/**
 * Gaji Sales Tetap and Gaji Karyawan merged into one list — same shape
 * (nama, jumlah, siap/sudah dibayar), same batch-pay action, just two
 * different underlying recipient types. Merged per the user's request
 * 2026-08-24 ("fieldnya sama kok"). Each row still posts through its own
 * existing endpoint (/api/payroll/gaji-sales/bayar or
 * .../gaji-karyawan/bayar) — see components/payroll/GajiBulananSheet.tsx.
 */
export async function getGajiBulananSummary(periode: string): Promise<GajiBulananRow[]> {
  const [salesRows, karyawanRows] = await Promise.all([
    getGajiSalesSummary(periode),
    getKaryawanGajiSummary(periode),
  ]);

  const fromSales: GajiBulananRow[] = salesRows.map((s) => ({
    tipe: "sales",
    id: s.salesId,
    nama: s.nama,
    subtitle: s.bank ? `${s.bank} · ${s.nomorRekening}` : "belum diisi",
    jumlah: s.gajiPokok,
    siapBayar: s.rekeningTerverifikasi,
    sudahDibayar: s.sudahDibayar,
  }));

  const fromKaryawan: GajiBulananRow[] = karyawanRows.map((k) => ({
    tipe: "karyawan",
    id: k.karyawanId,
    nama: k.nama,
    subtitle: `${k.jabatan ?? "Karyawan"} · ${k.hariHadir} hari hadir`,
    jumlah: k.totalGaji,
    siapBayar: k.totalGaji > 0,
    sudahDibayar: k.sudahDibayar,
  }));

  return [...fromSales, ...fromKaryawan].sort((a, b) => a.nama.localeCompare(b.nama));
}

export interface SlipGajiKomisiRow {
  invoiceId: string;
  nomor: string;
  itemLabel: string;
  komisiBaris: number;
  tanggalCair: Date;
}

export interface SlipGajiPokokRow {
  periode: string;
  gajiPokok: number;
  tanggalBayar: Date;
  buktiTransferUrl?: string;
}

export interface SlipGaji {
  salesId: string | null;
  statusKepegawaian: "tetap" | "freelance";
  gajiPokok: number;
  riwayatGajiPokok: SlipGajiPokokRow[];
  riwayatKomisi: SlipGajiKomisiRow[];
  totalKomisiDiterima: number;
}

/**
 * A sales's own payslip — matched by name against the logged-in User's
 * session.nama (Sales has no login of its own, see models/Sales.ts's doc
 * comment). Returns null if no Sales roster record matches that name.
 */
export async function getSlipGaji(salesNama: string): Promise<SlipGaji | null> {
  await dbConnect();
  const sales = await Sales.findOne({ nama: salesNama }).lean();
  if (!sales) return null;

  const [gajiPayments, invoices] = await Promise.all([
    GajiPayment.find({ tipe: "gaji-sales", sales: sales._id }).sort({ periode: -1 }).lean(),
    Invoice.find({ status: "paid", komisiCair: true, "sales.nama": salesNama })
      .sort({ komisiCairTanggal: -1 })
      .lean(),
  ]);

  const riwayatKomisi: SlipGajiKomisiRow[] = [];
  let totalKomisiDiterima = 0;
  for (const inv of invoices) {
    const items = inv.items.filter((i) => i.komisiSubtotal > 0);
    const komisiBaris = items.reduce((s, i) => s + i.komisiSubtotal, 0);
    if (komisiBaris <= 0) continue;
    totalKomisiDiterima += komisiBaris;
    riwayatKomisi.push({
      invoiceId: String(inv._id),
      nomor: inv.nomor,
      itemLabel: items.map((i) => `${i.namaSnapshot} x${i.qty}`).join(", "),
      komisiBaris,
      tanggalCair: inv.komisiCairTanggal!,
    });
  }

  return {
    salesId: String(sales._id),
    statusKepegawaian: (sales.statusKepegawaian as "tetap" | "freelance") ?? "freelance",
    gajiPokok: sales.gajiPokok ?? 0,
    riwayatGajiPokok: gajiPayments.map((p) => ({
      periode: p.periode,
      gajiPokok: p.gajiPokok ?? p.totalGaji,
      tanggalBayar: p.tanggalBayar,
      buktiTransferUrl: p.buktiTransferUrl ?? undefined,
    })),
    riwayatKomisi,
    totalKomisiDiterima,
  };
}
