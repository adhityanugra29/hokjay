import Link from "next/link";
import { LinkButton } from "@/components/ui/Button";
import { rupiah, formatDateShort } from "@/lib/format";
import { getPurchasingSummary, getPOsMenunggu, getPOsDiterimaRecent, getLowStockSuggestions } from "@/lib/purchasing";

export const dynamic = "force-dynamic";

/**
 * Purchasing dashboard — design "6a": stok minimum -> PO -> barang diterima
 * -> tagihan -> kas keluar, confirmed with the user 2026-08-24. Left column
 * is POs already in flight (waiting, sorted worst-late-first) plus what
 * just came in; right column is auto-suggested restocks from products
 * under their own stokMinimum.
 */
export default async function PurchasingDashboardPage() {
  const [summary, menunggu, diterimaRecent, suggestions] = await Promise.all([
    getPurchasingSummary(),
    getPOsMenunggu(),
    getPOsDiterimaRecent(),
    getLowStockSuggestions(),
  ]);

  return (
    <>
      <div className="mb-6 grid grid-cols-2 border-2 border-ink bg-panel lg:grid-cols-4">
        <div className="border-b border-r border-line p-5 lg:border-b-0">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">PO jalan</div>
          <div className="mt-1.5 font-sans text-[1.4rem] font-extrabold">{summary.poJalanCount} PO</div>
          <div className="mt-1 font-mono text-[0.7rem] text-muted">{summary.poTelatCount} telat</div>
        </div>
        <div className="border-b border-line p-5 lg:border-b-0 lg:border-r">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Nilai PO jalan
          </div>
          <div className="mt-1.5 whitespace-nowrap font-sans text-[1.4rem] font-extrabold">
            {rupiah(summary.poJalanNilai)}
          </div>
        </div>
        <div className="border-r border-line p-5">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Barang telat datang
          </div>
          <div className="mt-1.5 font-sans text-[1.4rem] font-extrabold text-accent">{summary.poTelatCount} PO</div>
          <div className="mt-1 font-mono text-[0.7rem] text-muted">{rupiah(summary.poTelatNilai)} tertahan</div>
        </div>
        <div className="bg-ink p-5 text-white">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
            Perlu dibeli
          </div>
          <div className="mt-1.5 font-sans text-[1.4rem] font-extrabold">{summary.perluDibeliCount} barang</div>
          <div className="mt-1 font-mono text-[0.7rem] text-white/55">di bawah stok minimum</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
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
              className={`grid grid-cols-[118px_1fr_120px_140px] items-center gap-4 border-b border-line py-3.5 pl-3 text-[0.85rem] no-underline hover:bg-[#fbfaf5] ${
                po.hariTelat > 0 ? "border-l-4 border-l-accent" : "border-l-4 border-l-line"
              }`}
            >
              <span className="font-mono text-[0.72rem] font-bold text-ink">{po.nomor}</span>
              <span className="text-ink">
                <span className="block font-bold">{po.supplier}</span>
                <span className="mt-0.5 block font-mono text-[0.72rem] text-muted">{po.itemLabel}</span>
              </span>
              <span
                className={`font-mono text-[0.72rem] font-bold ${po.hariTelat > 0 ? "text-accent" : "text-muted"}`}
              >
                {po.hariTelat > 0
                  ? `Telat ${po.hariTelat} hari`
                  : po.tanggalEstimasi
                    ? `ETA ${formatDateShort(po.tanggalEstimasi)}`
                    : "ETA belum diisi"}
              </span>
              <span className="text-right font-sans text-[0.95rem] font-extrabold">{rupiah(po.totalNilai)}</span>
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
              className="grid grid-cols-[118px_1fr_140px] items-center gap-4 border-b border-line py-3.5 text-[0.85rem] no-underline hover:bg-[#fbfaf5]"
            >
              <span className="font-mono text-[0.72rem] font-bold text-ink">{po.nomor}</span>
              <span className="text-ink">
                <span className="block font-bold">{po.supplier}</span>
                <span className="mt-0.5 block font-mono text-[0.72rem] text-muted">
                  {po.itemLabel} · diterima {po.tanggalDiterima ? formatDateShort(po.tanggalDiterima) : "—"}
                </span>
              </span>
              <span className="text-right font-sans text-[0.95rem] font-extrabold">{rupiah(po.totalNilai)}</span>
            </Link>
          ))}
          {diterimaRecent.length === 0 && (
            <div className="border-b border-line py-8 text-center font-mono text-[0.8rem] text-muted">
              Belum ada yang diterima minggu ini.
            </div>
          )}

          <div className="mt-5 border-t-2 border-ink pt-3.5 font-mono text-[0.72rem] text-muted">
            Barang yang diterima langsung menambah stok di{" "}
            <Link href="/produk" className="text-accent underline underline-offset-2">
              Inventory
            </Link>{" "}
            dan memunculkan tagihan di{" "}
            <Link href="/bayar-tagihan" className="text-accent underline underline-offset-2">
              Bayar Tagihan
            </Link>{" "}
            — tidak ada input dua kali.
          </div>
        </div>

        <div className="flex flex-col gap-3.5 border-l-2 border-ink pl-6">
          <div className="border-b-2 border-ink pb-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
            Usulan dari stok minimum
          </div>
          {suggestions.map((s) => (
            <div key={s.productId} className="border border-line bg-panel p-4">
              <div className="font-sans text-[0.95rem] font-extrabold">{s.nama}</div>
              <div className="mt-2 flex justify-between font-mono text-[0.72rem] text-muted">
                <span>
                  Stok sekarang <b className="text-accent">{s.stok} unit</b>
                </span>
                <span>min {s.stokMinimum} unit</span>
              </div>
              {s.supplierNama && (
                <div className="mt-2.5 border-t border-line pt-2.5 font-mono text-[0.72rem] text-muted">
                  Supplier terakhir
                  <div className="mt-0.5 font-sans text-[0.82rem] font-bold text-ink">{s.supplierNama}</div>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between gap-2.5">
                <div className="font-mono text-[0.72rem] text-muted">
                  Usul {s.usulQty} unit
                  <div className="font-sans text-[0.85rem] font-extrabold text-ink">{rupiah(s.usulTotal)}</div>
                </div>
                <LinkButton
                  variant="ghost"
                  href={`/purchasing/po/baru?productId=${s.productId}&qty=${s.usulQty}${
                    s.supplierId ? `&supplierId=${s.supplierId}` : ""
                  }`}
                >
                  Buat PO
                </LinkButton>
              </div>
            </div>
          ))}
          {suggestions.length === 0 && (
            <div className="border border-dashed border-line py-8 text-center font-mono text-[0.78rem] text-muted">
              Semua produk masih di atas stok minimum. 🎉
            </div>
          )}
        </div>
      </div>
    </>
  );
}
