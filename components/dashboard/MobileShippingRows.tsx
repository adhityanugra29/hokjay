import Link from "next/link";
import FollowUpStatusBadge from "@/components/dashboard/FollowUpStatusBadge";
import { rupiah } from "@/lib/format";
import { shippingUrgency, type ShippingRow } from "@/lib/dashboard";

/** Mobile-only card list for /follow-up?view=kirim — mirrors MobileFollowUpRows.tsx's shape but for ShippingRow (adds "paid") and shows the shipping-urgency label instead of "X hari sejak dibuat". Per the user's request 2026-09-19 ("pada saat di klik Lihat Semua tolong tampilkan semua yang ingin harus dikirim"). */
export default function MobileShippingRows({ rows }: { rows: ShippingRow[] }) {
  return (
    <div className="border-t border-line md:hidden">
      {rows.map((r) => {
        const urgency = shippingUrgency(r.tanggalKirim);
        return (
          <Link
            key={r.invoiceId}
            href={r.status === "draft" ? `/invoice/${r.invoiceId}/ubah` : `/invoice/${r.invoiceId}`}
            className="block border-b border-line py-3.5 no-underline"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-sans text-[0.86rem] font-semibold text-ink">{r.customerNama}</span>
                  <FollowUpStatusBadge status={r.status === "paid" ? "paid" : r.hasDp ? "dp" : r.status} />
                </div>
                <div className="mt-0.5 font-mono text-[0.68rem] text-muted">
                  {r.nomor} · {r.salesNama}
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between font-mono text-[0.8rem]">
              <span
                className={`font-semibold ${
                  urgency.tone === "overdue" ? "text-red-600" : urgency.tone === "today" ? "text-accent-700" : ""
                }`}
              >
                {urgency.label}
              </span>
              <span className="font-semibold">{r.status === "paid" ? "Lunas" : rupiah(r.sisaTagihan)}</span>
            </div>
          </Link>
        );
      })}
      {rows.length === 0 && (
        <div className="py-10 text-center font-mono text-sm text-muted">Tidak ada invoice yang perlu dikirim. 🎉</div>
      )}
    </div>
  );
}
