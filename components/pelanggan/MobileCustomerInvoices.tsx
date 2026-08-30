import Link from "next/link";
import Pill, { type PillVariant } from "@/components/ui/Pill";
import { rupiah, formatDateShort } from "@/lib/format";

const STATUS_LABEL: Record<string, { label: string; variant: PillVariant }> = {
  draft: { label: "Draft", variant: "draft" },
  unpaid: { label: "Belum Bayar", variant: "unpaid" },
  paid: { label: "Lunas", variant: "paid" },
};

export interface CustomerInvoiceRow {
  id: string;
  nomor: string;
  tanggal: Date | string;
  grandTotal: number;
  status: string;
}

/**
 * Mobile-only card list for a customer's invoice history (app/pelanggan/[id]/page.tsx)
 * — the 5-column table just becomes a horizontal-scroll wall on a phone.
 * Mirrors the established Mobile* card-list pattern. Per the user's
 * request 2026-08-30 ("mereka mobile oriented").
 */
export default function MobileCustomerInvoices({ invoices }: { invoices: CustomerInvoiceRow[] }) {
  return (
    <div className="md:hidden">
      {invoices.map((inv) => (
        <Link
          key={inv.id}
          href={`/invoice/${inv.id}`}
          className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 no-underline hover:bg-[#fbfaf5]"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[0.78rem] font-medium text-ink">{inv.nomor}</span>
              <Pill variant={STATUS_LABEL[inv.status ?? "draft"].variant}>{STATUS_LABEL[inv.status ?? "draft"].label}</Pill>
            </div>
            <div className="mt-0.5 font-mono text-[0.7rem] text-muted">{formatDateShort(inv.tanggal)}</div>
          </div>
          <div className="whitespace-nowrap font-mono text-[0.82rem] font-semibold">{rupiah(inv.grandTotal)}</div>
        </Link>
      ))}
      {invoices.length === 0 && (
        <div className="px-5 py-8 text-center font-mono text-sm text-muted">Belum ada invoice untuk pelanggan ini.</div>
      )}
    </div>
  );
}
