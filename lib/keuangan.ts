import { dbConnect } from "@/lib/db";
import { CashflowEntry } from "@/models/CashflowEntry";
import { Product } from "@/models/Product";

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
