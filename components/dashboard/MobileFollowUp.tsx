import Link from "next/link";
import FollowUpStatusBadge from "@/components/dashboard/FollowUpStatusBadge";
import { rupiah, rupiahCompact } from "@/lib/format";
import type { FollowUpInvoiceRow, FollowUpSalesSummary } from "@/lib/dashboard";

/**
 * Mobile-only card list for /follow-up — the 4- and 8-column tables just
 * become a horizontal-scroll wall of text on a phone, and sales reps are
 * mobile-oriented (this is their main invoice-chasing workflow). Mirrors
 * the established Mobile* card-list pattern (e.g.
 * components/pelanggan/MobilePelangganList.tsx). Per the user's request
 * 2026-08-30.
 */
export function MobileFollowUpBySales({ bySales }: { bySales: FollowUpSalesSummary[] }) {
  return (
    <div className="border-t border-line md:hidden">
      {bySales.map((s) => (
        <div key={s.salesNama} className="border-b border-line py-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-sans text-[0.85rem] font-semibold">{s.salesNama}</span>
            <span className="whitespace-nowrap font-mono text-[0.72rem] text-muted">{s.invoiceCount} invoice</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[0.76rem]">
            <span>{rupiahCompact(s.totalNilai)}</span>
            <span className="font-semibold text-accent-700">Komisi {rupiahCompact(s.totalKomisiPotensial)}</span>
          </div>
        </div>
      ))}
      {bySales.length === 0 && (
        <div className="py-8 text-center font-mono text-sm text-muted">Tidak ada invoice yang perlu ditindak.</div>
      )}
    </div>
  );
}

export function MobileFollowUpRows({ rows }: { rows: FollowUpInvoiceRow[] }) {
  return (
    <div className="border-t border-line md:hidden">
      {rows.map((r) => (
        <Link
          key={r.invoiceId}
          href={r.status === "draft" ? `/invoice/${r.invoiceId}/ubah` : `/invoice/${r.invoiceId}`}
          className="block border-b border-line py-3.5 no-underline"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-sans text-[0.86rem] font-semibold text-ink">{r.customerNama}</span>
                <FollowUpStatusBadge status={r.status} />
              </div>
              <div className="mt-0.5 font-mono text-[0.68rem] text-muted">
                {r.nomor} · {r.salesNama} · {r.hariBerjalan} hari
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[0.8rem]">
            <span className="font-semibold">
              {rupiah(r.sisaTagihan)}
              {r.sisaTagihan !== r.grandTotal && (
                <span className="ml-1 font-normal text-muted">(dari {rupiah(r.grandTotal)})</span>
              )}
            </span>
            <span className="font-semibold text-accent-700">{rupiah(r.komisiPotensial)}</span>
          </div>
        </Link>
      ))}
      {rows.length === 0 && (
        <div className="py-10 text-center font-mono text-sm text-muted">Tidak ada invoice yang perlu ditindak. 🎉</div>
      )}
    </div>
  );
}
