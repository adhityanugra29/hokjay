import { dbConnect } from "@/lib/db";
import { CashflowEntry } from "@/models/CashflowEntry";
import { Product } from "@/models/Product";
import { Pengaturan } from "@/models/Pengaturan";

export async function getKeuanganSummary(range: { from: Date; to: Date }) {
  await dbConnect();

  const entries = await CashflowEntry.find({ tanggal: { $gte: range.from, $lt: range.to } });

  const masukTotal = entries.filter((e) => e.tipe === "masuk").reduce((s, e) => s + e.nominal, 0);
  const keluarTotal = entries.filter((e) => e.tipe === "keluar").reduce((s, e) => s + e.nominal, 0);

  const byKategori = new Map<string, { tipe: "masuk" | "keluar"; total: number }>();
  for (const e of entries) {
    const row = byKategori.get(e.kategori) ?? { tipe: e.tipe as "masuk" | "keluar", total: 0 };
    row.total += e.nominal;
    byKategori.set(e.kategori, row);
  }
  const nodes = [...byKategori.entries()]
    .map(([label, v]) => ({ label, value: v.total, tipe: v.tipe }))
    .filter((n) => n.value > 0);

  const products = await Product.find();
  const nilaiStok = products.reduce((s, p) => s + p.stok * p.hargaRekomendasi, 0);

  return {
    masukTotal,
    keluarTotal,
    netTotal: masukTotal - keluarTotal,
    nilaiStok,
    nodes,
    productCount: products.length,
  };
}

async function getKasAwal(): Promise<{ amount: number; tanggal: Date }> {
  const doc = await Pengaturan.findById("singleton").lean();
  return { amount: doc?.kasAwal ?? 0, tanggal: doc?.kasAwalTanggal ?? new Date(0) };
}

export interface CashBookRow {
  id: string;
  tanggal: Date;
  keterangan: string;
  sub?: string;
  masuk?: number;
  keluar?: number;
  saldoBerjalan: number;
  isOpeningRow?: boolean;
}

export interface CashBook {
  saldoAwal: number;
  rows: CashBookRow[];
  totalMasuk: number;
  totalKeluar: number;
  saldoAkhir: number;
}

/**
 * "Buku kas" — every cashflow entry in the period with a running balance
 * column, plus an opening-balance row. saldoAwal = the singleton Kas Awal
 * setting (see models/Pengaturan.ts) plus every entry between its own date
 * and the start of this period — so the cashbook stays correct regardless
 * of which month is being viewed.
 */
export async function getCashBook(range: { from: Date; to: Date }): Promise<CashBook> {
  await dbConnect();
  const kasAwal = await getKasAwal();

  const priorEntries = await CashflowEntry.find({
    tanggal: { $gte: kasAwal.tanggal, $lt: range.from },
  }).lean();
  const priorNet = priorEntries.reduce((s, e) => s + (e.tipe === "masuk" ? e.nominal : -e.nominal), 0);
  const saldoAwal = kasAwal.amount + priorNet;

  const entries = await CashflowEntry.find({ tanggal: { $gte: range.from, $lt: range.to } })
    .sort({ tanggal: 1, createdAt: 1 })
    .lean();

  let running = saldoAwal;
  const rows: CashBookRow[] = [
    {
      id: "opening",
      tanggal: range.from,
      keterangan: "Saldo awal bulan",
      saldoBerjalan: saldoAwal,
      isOpeningRow: true,
    },
  ];
  let totalMasuk = 0;
  let totalKeluar = 0;
  for (const e of entries) {
    running += e.tipe === "masuk" ? e.nominal : -e.nominal;
    if (e.tipe === "masuk") totalMasuk += e.nominal;
    else totalKeluar += e.nominal;
    rows.push({
      id: String(e._id),
      tanggal: e.tanggal ?? e.createdAt!,
      keterangan: e.keterangan,
      sub: e.referensi ?? undefined,
      masuk: e.tipe === "masuk" ? e.nominal : undefined,
      keluar: e.tipe === "keluar" ? e.nominal : undefined,
      saldoBerjalan: running,
    });
  }

  return { saldoAwal, rows, totalMasuk, totalKeluar, saldoAkhir: running };
}

/** True current cash position (all-time), independent of whatever month is selected — powers the "Sisa kas hari ini" stat. */
export async function getCurrentCashBalance(): Promise<number> {
  await dbConnect();
  const kasAwal = await getKasAwal();
  const entries = await CashflowEntry.find({ tanggal: { $gte: kasAwal.tanggal } }).lean();
  const net = entries.reduce((s, e) => s + (e.tipe === "masuk" ? e.nominal : -e.nominal), 0);
  return kasAwal.amount + net;
}
