import Link from "next/link";
import { rupiah, rupiahCompact, formatDateShort } from "@/lib/format";
import type { PurchasingSummary, PurchaseOrderRow } from "@/lib/purchasing";

/**
 * "7i" — mobile-only Purchasing dashboard body: telat PO surfaced first
 * (red banner), then the same "menunggu"/"diterima" lists as the desktop
 * "6a" dashboard, and a sticky bottom CTA. Sits below the shared
 * PageHeader/SubnavTabs from app/purchasing/(list)/layout.tsx (unchanged,
 * already mobile-responsive, and the only way to reach Job
 * Order/Produk PO/Material Order/Supplier on mobile) — so unlike the
 * other "7" pages this one doesn't own its own dark header.
 *
 * The mockup's bottom CTA implies a scan-a-delivery-note flow the app
 * doesn't have — there's no barcode scanner here, so the button instead
 * jumps straight to the single most urgent PO's own receive page (same
 * TerimaPOButton flow every PO detail page already has), rather than
 * promising a capability that doesn't exist.
 */
export default function MobilePurchasing({
  summary,
  menunggu,
  diterimaRecent,
}: {
  summary: PurchasingSummary;
  menunggu: PurchaseOrderRow[];
  diterimaRecent: PurchaseOrderRow[];
}) {
  const telat = menunggu.filter((po) => po.hariTelat > 0);
  const telatLabel = telat
    .slice(0, 2)
    .map((po) => `${po.supplier.split(" ")[0]} ${po.hariTelat} hari`)
    .join(" · ");
  const mostUrgent = menunggu[0];

  return (
    <div className="-mx-6 mt-1 flex flex-col bg-panel md:hidden">
      {telat.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-accent px-4 py-3.5 text-white">
          <span className="min-w-0">
            <b className="block font-sans text-[0.9rem] tracking-tight">{telat.length} PO telat datang</b>
            <span className="mt-0.5 block truncate font-sans text-[0.72rem] text-white/75">{telatLabel}</span>
          </span>
          <b className="whitespace-nowrap font-sans text-[0.9rem] tracking-tight">{rupiahCompact(summary.poTelatNilai)}</b>
        </div>
      )}

      <div className="flex-1">
        <div className="px-4 pb-2 pt-4 font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
          Menunggu barang
        </div>
        <div className="border-t border-line bg-white">
          {menunggu.map((po) => (
            <Link
              key={po.id}
              href={`/purchasing/po/${po.id}`}
              className={`flex flex-col gap-1.5 border-b border-line py-3.5 pl-3 pr-4 no-underline ${
                po.hariTelat > 0 ? "border-l-4 border-l-accent" : "border-l-4 border-l-line"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2.5">
                <b className="min-w-0 truncate font-sans text-[0.85rem] text-ink">{po.supplier}</b>
                <b className="whitespace-nowrap font-sans text-[0.82rem] tracking-tight text-ink">{rupiah(po.totalNilai)}</b>
              </div>
              <div className="truncate font-sans text-[0.72rem] text-muted">{po.itemLabel}</div>
              <div className="flex items-center justify-between gap-2.5">
                <span className="font-mono text-[10.5px] font-bold text-muted">{po.nomor}</span>
                {po.hariTelat > 0 ? (
                  <b className="font-sans text-[0.72rem] text-accent">Telat {po.hariTelat} hari</b>
                ) : po.tanggalEstimasi ? (
                  <span className="font-sans text-[0.72rem] font-bold text-muted">ETA {formatDateShort(po.tanggalEstimasi)}</span>
                ) : (
                  <span className="font-sans text-[0.72rem] text-muted">ETA belum diisi</span>
                )}
              </div>
            </Link>
          ))}
          {menunggu.length === 0 && (
            <div className="py-8 text-center font-sans text-[0.82rem] text-muted">Tidak ada PO yang menunggu barang datang.</div>
          )}
        </div>

        <div className="px-4 pb-2 pt-4 font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
          Baru diterima minggu ini
        </div>
        <div className="border-t border-line bg-white">
          {diterimaRecent.map((po) => (
            <Link
              key={po.id}
              href={`/purchasing/po/${po.id}`}
              className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-3 no-underline"
            >
              <span className="min-w-0">
                <b className="block font-sans text-[0.85rem] text-ink">{po.supplier}</b>
                <span className="mt-0.5 block truncate font-sans text-[0.72rem] text-muted">
                  {po.nomor} · masuk stok {po.tanggalDiterima ? formatDateShort(po.tanggalDiterima) : "—"}
                </span>
              </span>
              <b className="whitespace-nowrap font-sans text-[0.82rem] tracking-tight text-ink">{rupiah(po.totalNilai)}</b>
            </Link>
          ))}
          {diterimaRecent.length === 0 && (
            <div className="py-8 text-center font-sans text-[0.82rem] text-muted">Belum ada yang diterima minggu ini.</div>
          )}
        </div>
      </div>

      <div className="sticky bottom-[58px] border-t-2 border-ink bg-white px-4 py-3.5">
        {mostUrgent ? (
          <Link
            href={`/purchasing/po/${mostUrgent.id}`}
            className="flex min-h-[44px] items-center justify-between gap-2 bg-accent px-4 py-3.5 font-sans text-[0.9rem] font-extrabold text-white no-underline"
          >
            Terima barang PO
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 10h11M10.5 5.5 15 10l-4.5 4.5" />
            </svg>
          </Link>
        ) : (
          <div className="flex min-h-[44px] items-center justify-center bg-ink/10 px-4 py-3.5 text-center font-sans text-[0.85rem] text-muted">
            Tidak ada PO yang menunggu barang
          </div>
        )}
        <div className="mt-2 font-sans text-[10.5px] text-muted">
          Pilih PO dari daftar di atas untuk menerima barangnya — langsung menambah stok di Inventory.
        </div>
      </div>
    </div>
  );
}
