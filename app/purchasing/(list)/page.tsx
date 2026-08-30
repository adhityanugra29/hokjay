import Link from "next/link";
import MobilePurchasing from "@/components/purchasing/MobilePurchasing";
import { rupiah, formatDateShort } from "@/lib/format";
import { getPurchasingSummary, getPOsMenunggu, getPOsDiterimaRecent } from "@/lib/purchasing";

export const dynamic = "force-dynamic";

/**
 * Purchasing dashboard — design "6a": stok minimum -> PO -> barang diterima
 * -> tagihan -> kas keluar, confirmed with the user 2026-08-24. POs already
 * in flight (waiting, sorted worst-late-first) plus what just came in.
 * The "Usulan dari stok minimum" sidebar (auto-suggested restocks with a
 * "Buat PO" shortcut) was dropped 2026-08-27 per the user's request — the
 * "Perlu dibeli" stat card above still surfaces the same underlying
 * low-stock count, this just removes the per-item suggestion cards.
 * getLowStockSuggestions() itself is untouched — Beranda's mobile "stok
 * tipis" alert still uses it.
 */
export default async function PurchasingDashboardPage() {
  const [summary, menunggu, diterimaRecent] = await Promise.all([
    getPurchasingSummary(),
    getPOsMenunggu(),
    getPOsDiterimaRecent(),
  ]);

  return (
    <>
      {/* Mobile — "7i" */}
      <MobilePurchasing summary={summary} menunggu={menunggu} diterimaRecent={diterimaRecent} />

      {/* Desktop — "6a" */}
      <div className="hidden md:block">
      <div className="mb-6 grid grid-cols-2 border-2 border-ink bg-panel lg:grid-cols-4">
        <div className="min-w-0 border-b border-r border-line p-4 sm:p-5 lg:border-b-0">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">PO jalan</div>
          <div className="mt-1.5 font-sans text-[1.15rem] font-extrabold sm:text-[1.4rem]">{summary.poJalanCount} PO</div>
          <div className="mt-1 font-mono text-[0.7rem] text-muted">{summary.poTelatCount} telat</div>
        </div>
        <div className="min-w-0 border-b border-line p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Nilai PO jalan
          </div>
          <div className="mt-1.5 font-sans text-[1.15rem] font-extrabold sm:whitespace-nowrap sm:text-[1.4rem]">
            {rupiah(summary.poJalanNilai)}
          </div>
        </div>
        <div className="min-w-0 border-r border-line p-4 sm:p-5">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Barang telat datang
          </div>
          <div className="mt-1.5 font-sans text-[1.15rem] font-extrabold text-accent-700 sm:text-[1.4rem]">{summary.poTelatCount} PO</div>
          <div className="mt-1 font-mono text-[0.7rem] text-muted">{rupiah(summary.poTelatNilai)} tertahan</div>
        </div>
        <div className="min-w-0 bg-ink p-4 text-white sm:p-5">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
            Perlu dibeli
          </div>
          <div className="mt-1.5 font-sans text-[1.15rem] font-extrabold sm:text-[1.4rem]">{summary.perluDibeliCount} barang</div>
          <div className="mt-1 font-mono text-[0.7rem] text-white/55">di bawah stok minimum</div>
        </div>
      </div>

      <div>
          <div className="flex items-center justify-between border-b-2 border-ink pb-2.5">
            <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
              Menunggu barang datang
            </span>
          </div>
          {menunggu.map((po) => (
            <Link
              key={po.id}
              href={`/purchasing/po/${po.id}`}
              className={`grid grid-cols-1 gap-1.5 border-b border-line py-3.5 pl-3 text-[0.85rem] no-underline hover:bg-[#fbfaf5] sm:grid-cols-[100px_1fr_120px_140px] sm:items-center sm:gap-4 ${
                po.hariTelat > 0 ? "border-l-4 border-l-accent" : "border-l-4 border-l-line"
              }`}
            >
              <span className="font-mono text-[0.72rem] font-bold text-ink">{po.nomor}</span>
              <span className="text-ink">
                <span className="block font-bold">{po.supplier}</span>
                <span className="mt-0.5 block font-mono text-[0.72rem] text-muted">{po.itemLabel}</span>
              </span>
              <span
                className={`font-mono text-[0.72rem] font-bold ${po.hariTelat > 0 ? "text-accent-700" : "text-muted"}`}
              >
                {po.hariTelat > 0
                  ? `Telat ${po.hariTelat} hari`
                  : po.tanggalEstimasi
                    ? `ETA ${formatDateShort(po.tanggalEstimasi)}`
                    : "ETA belum diisi"}
              </span>
              <span className="font-sans text-[0.95rem] font-extrabold sm:text-right">{rupiah(po.totalNilai)}</span>
            </Link>
          ))}
          {menunggu.length === 0 && (
            <div className="border-b border-line py-8 text-center font-mono text-[0.8rem] text-muted">
              Tidak ada PO yang menunggu barang datang.
            </div>
          )}

          <div className="mt-7 flex items-center justify-between border-b-2 border-ink pb-2.5">
            <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
              Baru diterima minggu ini
            </span>
          </div>
          {diterimaRecent.map((po) => (
            <Link
              key={po.id}
              href={`/purchasing/po/${po.id}`}
              className="grid grid-cols-1 gap-1.5 border-b border-line py-3.5 text-[0.85rem] no-underline hover:bg-[#fbfaf5] sm:grid-cols-[100px_1fr_140px] sm:items-center sm:gap-4"
            >
              <span className="font-mono text-[0.72rem] font-bold text-ink">{po.nomor}</span>
              <span className="text-ink">
                <span className="block font-bold">{po.supplier}</span>
                <span className="mt-0.5 block font-mono text-[0.72rem] text-muted">
                  {po.itemLabel} · diterima {po.tanggalDiterima ? formatDateShort(po.tanggalDiterima) : "—"}
                </span>
              </span>
              <span className="font-sans text-[0.95rem] font-extrabold sm:text-right">{rupiah(po.totalNilai)}</span>
            </Link>
          ))}
          {diterimaRecent.length === 0 && (
            <div className="border-b border-line py-8 text-center font-mono text-[0.8rem] text-muted">
              Belum ada yang diterima minggu ini.
            </div>
          )}

          <div className="mt-5 border-t-2 border-ink pt-3.5 font-mono text-[0.72rem] text-muted">
            Barang yang diterima langsung menambah stok di{" "}
            <Link href="/produk" className="text-accent-700 underline underline-offset-2">
              Inventory
            </Link>{" "}
            dan memunculkan tagihan di{" "}
            <Link href="/bayar-tagihan" className="text-accent-700 underline underline-offset-2">
              Bayar Tagihan
            </Link>{" "}
            — tidak ada input dua kali.
          </div>
      </div>
      </div>
    </>
  );
}
