import { dbConnect } from "@/lib/db";
import { OfficeAsset } from "@/models/OfficeAsset";
import { nilaiBuku, penyusutanBulanan } from "@/lib/depresiasi";

export interface InventarisSummary {
  jumlahAset: number;
  kategoriCount: number;
  hargaBeliTotal: number;
  nilaiBukuTotal: number;
  penyusutanBulanIni: number;
  perluTindakanCount: number;
  servisCount: number;
  rusakCount: number;
}

export async function getInventarisSummary(): Promise<InventarisSummary> {
  await dbConnect();
  const assets = await OfficeAsset.find().lean();
  const now = new Date();

  const kategoriSet = new Set(assets.map((a) => a.kategori));
  const active = assets.filter((a) => !a.dihapusBuku);
  const servisCount = active.filter((a) => a.kondisi === "perlu_servis").length;
  const rusakCount = active.filter((a) => a.kondisi === "rusak").length;

  return {
    jumlahAset: assets.reduce((s, a) => s + a.qty, 0),
    kategoriCount: kategoriSet.size,
    hargaBeliTotal: assets.reduce((s, a) => s + (a.hargaPerolehan ?? 0), 0),
    nilaiBukuTotal: assets.reduce((s, a) => s + nilaiBuku(a, now), 0),
    penyusutanBulanIni: assets.reduce((s, a) => s + penyusutanBulanan(a, now), 0),
    perluTindakanCount: servisCount + rusakCount,
    servisCount,
    rusakCount,
  };
}
