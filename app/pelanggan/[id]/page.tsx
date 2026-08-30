import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import { RowActionLink } from "@/components/ui/RowAction";
import { LinkButton } from "@/components/ui/Button";
import Pill, { type PillVariant } from "@/components/ui/Pill";
import SortableHeader from "@/components/ui/SortableHeader";
import DeleteCustomerButton from "@/components/pelanggan/DeleteCustomerButton";
import MobileCustomerInvoices from "@/components/pelanggan/MobileCustomerInvoices";
import { dbConnect } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { Invoice } from "@/models/Invoice";
import { rupiah, formatDateShort } from "@/lib/format";
import { parseSort, mongoSort } from "@/lib/sort";
import { getSession } from "@/lib/auth/session";
import { invoiceVisibilityFilter } from "@/lib/invoice-visibility";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; variant: PillVariant }> = {
  draft: { label: "Draft", variant: "draft" },
  unpaid: { label: "Belum Bayar", variant: "unpaid" },
  paid: { label: "Lunas", variant: "paid" },
};

const SORT_FIELDS = ["nomor", "tanggalInvoice", "grandTotal", "status"] as const;

export default async function PelangganHistoryPage({ params, searchParams }: PageProps<"/pelanggan/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const hasSort = typeof sp.sort === "string" && (SORT_FIELDS as readonly string[]).includes(sp.sort);
  const { field, dir } = parseSort(sp, SORT_FIELDS, "tanggalInvoice");
  await dbConnect();

  const customer = await Customer.findById(id).lean();
  if (!customer) notFound();

  // Per-sales customer privacy (2026-08-27, tightened 2026-08-30) — a plain
  // "sales" role can't open another sales rep's customer directly by URL
  // either, not just filtered off the list. A customer with no owner
  // (assignedSales unset) is now blocked too, matching lib/pelanggan.ts's
  // customerVisibilityFilter. Manager/Admin/Owner/Super Admin are
  // unrestricted, same as the list page.
  const session = await getSession();
  if (session?.role === "sales" && customer.assignedSales !== session.nama) {
    notFound();
  }

  // Per-sales invoice privacy (2026-08-29) — belt-and-suspenders now that
  // a sales rep can only reach their own customer anyway: still only shows
  // invoices this rep themselves made for that customer.
  const invoices = await Invoice.find({ "customer.ref": id, ...invoiceVisibilityFilter(session) }).sort(
    hasSort ? mongoSort(field, dir) : { createdAt: -1 }
  );
  const totalBelanja = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.grandTotal, 0);

  return (
    <>
      <PageHeader
        title={customer.nama}
        subtitle={`${customer.kode}${customer.namaToko ? ` · ${customer.namaToko}` : ""}${customer.jenisUsaha ? ` · ${customer.jenisUsaha.toUpperCase()}` : ""} · TOTAL BELANJA ${rupiah(totalBelanja)}`}
        actions={
          <>
            <LinkButton variant="ghost" href={`/pelanggan/${id}/edit`}>
              Ubah
            </LinkButton>
            <DeleteCustomerButton customerId={id} customerName={customer.nama} />
          </>
        }
      />
      <div className="p-6 md:p-9">
        <Panel>
          <PanelHead title="Semua invoice pelanggan ini" />
          {/* Mobile card list below md; the fixed-column table takes over
              at md+. Per the user's request 2026-08-30 ("mereka mobile
              oriented"). */}
          <MobileCustomerInvoices
            invoices={invoices.map((inv) => ({
              id: String(inv._id),
              nomor: inv.nomor,
              tanggal: inv.tanggalInvoice ?? inv.createdAt!,
              grandTotal: inv.grandTotal,
              status: inv.status ?? "draft",
            }))}
          />
          <div className="hidden md:block">
          <TableScroll>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <SortableHeader label="No. Invoice" sortKey="nomor" currentSort={field} currentDir={dir} basePath={`/pelanggan/${id}`} searchParams={sp} />
                  <SortableHeader label="Tanggal" sortKey="tanggalInvoice" currentSort={field} currentDir={dir} basePath={`/pelanggan/${id}`} searchParams={sp} />
                  <SortableHeader label="Total" sortKey="grandTotal" currentSort={field} currentDir={dir} basePath={`/pelanggan/${id}`} searchParams={sp} align="right" />
                  <SortableHeader label="Status" sortKey="status" currentSort={field} currentDir={dir} basePath={`/pelanggan/${id}`} searchParams={sp} />
                  <th className="border-b border-line px-5 py-4" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={String(inv._id)} className="hover:bg-[#fbfaf5]">
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{inv.nomor}</td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                      {formatDateShort(inv.tanggalInvoice ?? inv.createdAt!)}
                    </td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                      {rupiah(inv.grandTotal)}
                    </td>
                    <td className="border-b border-line px-5 py-4.5">
                      <Pill variant={STATUS_LABEL[inv.status ?? "draft"].variant}>
                        {STATUS_LABEL[inv.status ?? "draft"].label}
                      </Pill>
                    </td>
                    <td className="border-b border-line px-5 py-4.5">
                      <RowActionLink href={`/invoice/${inv._id}`}>Lihat</RowActionLink>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center font-mono text-sm text-muted">
                      Belum ada invoice untuk pelanggan ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableScroll>
          </div>
        </Panel>
      </div>
    </>
  );
}
