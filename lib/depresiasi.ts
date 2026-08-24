// Pure depreciation math, no server-only imports — safe to use from both
// server code (lib/inventaris.ts) and client components
// (components/inventaris/OfficeAssetManager.tsx), same reasoning as
// lib/auth/access.ts staying dependency-free.

export interface DepresiasiInput {
  kategori: "peralatan" | "habis_pakai";
  hargaPerolehan?: number | null;
  tanggalPerolehan?: string | Date | null;
  umurEkonomisBulan?: number | null;
  dihapusBuku?: boolean | null;
}

function monthsElapsed(from: Date, to: Date): number {
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  return Math.max(0, months);
}

/** Straight-line depreciation, display-only — see lib/inventaris.ts's doc comment for what's simplified. */
export function nilaiBuku(asset: DepresiasiInput, asOf: Date = new Date()): number {
  if (asset.dihapusBuku) return 0;
  if (asset.kategori !== "peralatan") return 0;
  const harga = asset.hargaPerolehan ?? 0;
  if (harga <= 0) return 0;
  const umur = asset.umurEkonomisBulan || 48;
  const perolehan = asset.tanggalPerolehan ? new Date(asset.tanggalPerolehan) : asOf;
  const bulan = Math.min(monthsElapsed(perolehan, asOf), umur);
  const depresiasi = (harga / umur) * bulan;
  return Math.max(0, Math.round(harga - depresiasi));
}

export function penyusutanBulanan(asset: DepresiasiInput, asOf: Date = new Date()): number {
  if (asset.dihapusBuku || asset.kategori !== "peralatan") return 0;
  const harga = asset.hargaPerolehan ?? 0;
  if (harga <= 0) return 0;
  const umur = asset.umurEkonomisBulan || 48;
  const perolehan = asset.tanggalPerolehan ? new Date(asset.tanggalPerolehan) : asOf;
  const bulan = monthsElapsed(perolehan, asOf);
  if (bulan >= umur) return 0;
  return Math.round(harga / umur);
}
