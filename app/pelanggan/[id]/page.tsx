import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import { RowActionLink } from "@/components/ui/RowAction";
import Pill, { type PillVariant } from "@/components/ui/Pill";
import SortableHeader from "@/components/ui/SortableHeader";
import { dbConnect } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { Invoice } from "@/models/Invoice";
import { rupiah, formatDateShort } from "@/lib/format";
import { parseSort, mongoSort } from "@/lib/sort";
import { getSession } from "@/lib/auth/session";

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

  // Per-sales customer privacy (2026-08-27) — a plain "sales" role can't
  // open another sales rep's customer directly by URL either, not just
  // filtered off the list. A customer with no owner (assignedSales unset)
  // stays reachable by every sales rep. Manager/Admin/Owner/Super Admin
  // are unrestricted, same as the list page.
  const session = await getSession();
  if (session?.role === "sales" && customer.assignedSales && customer.assignedSales !== session.nama) {
    notFound();
  }

  const invoices = await Invoice.find({ "customer.ref": id }).sort(hasSort ? mongoSort(field, dir) : { createdAt: -1 });
  const totalBelanja = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.grandTotal, 0);

  return (
    <>
      <PageHeader
        title={customer.nama}
        subtitle={`${customer.kode}${customer.namaToko ? ` · ${customer.namaToko}` : ""}${customer.jenisUsaha ? ` · ${customer.jenisUsaha.toUpperCase()}` : ""} · TOTAL BELANJA ${rupiah(totalBelanja)}`}
      />
      <div className="p-6 md:p-9">
        <Panel>
          <PanelHead title="Semua invoice pelanggan ini" />
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
        </Panel>
      </div>
    </>
  );
}
