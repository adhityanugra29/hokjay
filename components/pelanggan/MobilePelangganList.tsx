import { rupiahCompact } from "@/lib/format";
import { RowActionLink } from "@/components/ui/RowAction";
import type { CustomerPriorityRow } from "@/lib/pelanggan";

/**
 * Mobile-only card list for "Semua pelanggan" — the fixed-width grid table
 * just becomes tiny/cramped on a phone. Mirrors the established Mobile*
 * card-list pattern (e.g. components/purchasing/MobileSupplier.tsx,
 * components/produk/MobileProdukList.tsx). Per the user's request
 * 2026-08-25.
 */
export default function MobilePelangganList({ rows, emptyMessage }: { rows: CustomerPriorityRow[]; emptyMessage: React.ReactNode }) {
  return (
    <div className="border-t border-line md:hidden">
      {rows.map((r) => (
        <div key={r._id} className="border-b border-line py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-sans text-[0.88rem] font-semibold">{r.nama}</div>
              <div className="mt-0.5 font-mono text-[0.68rem] text-muted">
                {r.kode}
                {r.kota ? ` · ${r.kota}` : ""}
              </div>
            </div>
            <RowActionLink href={`/pelanggan/${r._id}`}>Riwayat</RowActionLink>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[0.78rem]">
            <span className="font-semibold">{rupiahCompact(r.nilaiBelanja)}</span>
            <span className="text-muted">{r.orderCount} order</span>
            {r.piutang > 0 && <span className="font-semibold text-accent">Piutang {rupiahCompact(r.piutang)}</span>}
          </div>
        </div>
      ))}
      {rows.length === 0 && (
        <div className="py-10 text-center font-mono text-sm text-muted">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
