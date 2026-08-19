import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { Panel, PanelHead, SearchInput, TableScroll } from "@/components/ui/Panel";
import { RowActionLink } from "@/components/ui/RowAction";
import Pill, { type PillVariant } from "@/components/ui/Pill";
import { LinkButton } from "@/components/ui/Button";
import SortableHeader from "@/components/ui/SortableHeader";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { rupiah } from "@/lib/format";
import { parseSort, mongoSort } from "@/lib/sort";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; variant: PillVariant }> = {
  draft: { label: "Draft", variant: "draft" },
  unpaid: { label: "Belum Bayar", variant: "unpaid" },
  paid: { label: "Lunas", variant: "paid" },
};

const SORT_FIELDS = ["nomor", "customer.nama", "sales.nama", "grandTotal", "status"] as const;

export default async function InvoiceListPage({ searchParams }: PageProps<"/invoice">) {
  const sp = await searchParams;
  const { search } = sp;
  const hasSort = typeof sp.sort === "string" && (SORT_FIELDS as readonly string[]).includes(sp.sort);
  const { field, dir } = parseSort(sp, SORT_FIELDS, "nomor");
  await dbConnect();

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { nomor: { $regex: search, $options: "i" } },
      { "customer.nama": { $regex: search, $options: "i" } },
    ];
  }
  // Default (before any header is clicked): newest first.
  const invoices = await Invoice.find(filter).sort(hasSort ? mongoSort(field, dir) : { createdAt: -1 });

  const total = invoices.length;
  const draftCount = invoices.filter((i) => i.status === "draft").length;
  const unpaidCount = invoices.filter((i) => i.status === "unpaid").length;

  return (
    <>
      <PageHeader
        title="Invoice"
        subtitle={`${total} INVOICE · ${draftCount} DRAFT · ${unpaidCount} BELUM LUNAS`}
        actions={<LinkButton href="/katalog">+ Belanja / Buat Invoice</LinkButton>}
      />
      <div className="p-6 md:p-9">
        <Panel>
          <PanelHead title="Semua invoice">
            <form>
              <SearchInput name="search" defaultValue={search as string} placeholder="Cari no. invoice atau pelanggan..." />
            </form>
          </PanelHead>
          <TableScroll>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <SortableHeader label="No. Invoice" sortKey="nomor" currentSort={field} currentDir={dir} basePath="/invoice" searchParams={sp} />
                  <SortableHeader label="Pelanggan" sortKey="customer.nama" currentSort={field} currentDir={dir} basePath="/invoice" searchParams={sp} />
                  <SortableHeader label="Sales" sortKey="sales.nama" currentSort={field} currentDir={dir} basePath="/invoice" searchParams={sp} />
                  <SortableHeader label="Total" sortKey="grandTotal" currentSort={field} currentDir={dir} basePath="/invoice" searchParams={sp} align="right" />
                  <SortableHeader label="Status" sortKey="status" currentSort={field} currentDir={dir} basePath="/invoice" searchParams={sp} />
                  <th className="border-b border-line px-5 py-4" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const status = STATUS_LABEL[inv.status ?? "draft"];
                  return (
                    <tr key={String(inv._id)} className="hover:bg-[#fbfaf5]">
                      <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{inv.nomor}</td>
                      <td className="border-b border-line px-5 py-4.5">
                        {inv.customer?.ref ? (
                          <Link href={`/pelanggan/${inv.customer.ref}`} className="hover:underline">
                            {inv.customer.nama}
                          </Link>
                        ) : (
                          (inv.customer?.nama ?? "—")
                        )}
                      </td>
                      <td className="border-b border-line px-5 py-4.5">{inv.sales?.nama}</td>
                      <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                        {rupiah(inv.grandTotal)}
                      </td>
                      <td className="border-b border-line px-5 py-4.5">
                        <Pill variant={status.variant}>{status.label}</Pill>
                      </td>
                      <td className="border-b border-line px-5 py-4.5">
                        <RowActionLink href={`/invoice/${inv._id}`}>
                          {inv.status === "draft" ? "Lanjutkan" : "Lihat"}
                        </RowActionLink>
                      </td>
                    </tr>
                  );
                })}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center font-mono text-sm text-muted">
                      Belum ada invoice.
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
