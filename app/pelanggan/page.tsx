import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { Panel, PanelHead, SearchInput, TableScroll } from "@/components/ui/Panel";
import { RowActionLink } from "@/components/ui/RowAction";
import { LinkButton } from "@/components/ui/Button";
import SortableHeader from "@/components/ui/SortableHeader";
import { dbConnect } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { Invoice } from "@/models/Invoice";
import { rupiah } from "@/lib/format";
import { parseSort, sortRows } from "@/lib/sort";
import type { Types } from "mongoose";

export const dynamic = "force-dynamic";

const SORT_FIELDS = ["kode", "nama", "whatsapp", "totalBelanja"] as const;

export default async function PelangganPage({ searchParams }: PageProps<"/pelanggan">) {
  const sp = await searchParams;
  const { search } = sp;
  const { field, dir } = parseSort(sp, SORT_FIELDS, "totalBelanja");
  const defaultDir = sp.sort ? dir : "desc"; // unsorted default: highest spend first
  await dbConnect();

  const filter: Record<string, unknown> = {};
  if (search) filter.nama = { $regex: search, $options: "i" };
  const customers = await Customer.find(filter).lean();

  const spendRows: { _id: Types.ObjectId; total: number }[] = await Invoice.aggregate([
    { $match: { status: "paid", "customer.ref": { $ne: null } } },
    { $group: { _id: "$customer.ref", total: { $sum: "$grandTotal" } } },
  ]);
  const spendMap = new Map(spendRows.map((r) => [String(r._id), r.total]));

  const rows = sortRows(
    customers.map((c) => ({ ...c, totalBelanja: spendMap.get(String(c._id)) ?? 0 })),
    field,
    defaultDir
  );

  return (
    <>
      <PageHeader
        title="Pelanggan"
        subtitle={`${customers.length} PELANGGAN TERDAFTAR · KODE OTOMATIS`}
        actions={<LinkButton href="/pelanggan/baru">+ Tambah Pelanggan</LinkButton>}
      />
      <div className="p-6 md:p-9">
        <Panel>
          <PanelHead title="Semua pelanggan · diurutkan dari total belanja tertinggi">
            <form>
              <SearchInput name="search" defaultValue={search as string} placeholder="Cari nama pelanggan..." />
            </form>
          </PanelHead>
          <TableScroll>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <SortableHeader label="Kode" sortKey="kode" currentSort={field} currentDir={defaultDir} basePath="/pelanggan" searchParams={sp} />
                  <SortableHeader label="Nama" sortKey="nama" currentSort={field} currentDir={defaultDir} basePath="/pelanggan" searchParams={sp} />
                  <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                    Jenis Usaha
                  </th>
                  <SortableHeader label="Kontak" sortKey="whatsapp" currentSort={field} currentDir={defaultDir} basePath="/pelanggan" searchParams={sp} />
                  <SortableHeader label="Total Belanja" sortKey="totalBelanja" currentSort={field} currentDir={defaultDir} basePath="/pelanggan" searchParams={sp} align="right" />
                  <th className="border-b border-line px-5 py-4" />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={String(c._id)} className="hover:bg-[#fbfaf5]">
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{c.kode}</td>
                    <td className="border-b border-line px-5 py-4.5 font-medium">
                      {c.nama}
                      {c.namaToko && <div className="font-mono text-[0.7rem] text-muted">{c.namaToko}</div>}
                    </td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.75rem] text-muted">
                      {c.jenisUsaha || "—"}
                    </td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{c.whatsapp}</td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                      {rupiah(c.totalBelanja)}
                    </td>
                    <td className="border-b border-line px-5 py-4.5">
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`https://wa.me/${c.whatsapp.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block cursor-pointer rounded-full border border-moss bg-panel px-3 py-1.5 font-mono text-[0.7rem] font-medium leading-tight text-moss-deep no-underline transition hover:bg-moss hover:text-white"
                        >
                          WA
                        </a>
                        <RowActionLink href={`/pelanggan/${c._id}`}>Riwayat</RowActionLink>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center font-mono text-sm text-muted">
                      Belum ada pelanggan.{" "}
                      <Link href="/pelanggan/baru" className="text-moss-deep underline">
                        Tambah pelanggan pertama
                      </Link>
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
