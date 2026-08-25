import Link from "next/link";
import { Panel, PanelHead, SearchInput, TableScroll } from "@/components/ui/Panel";
import Pill from "@/components/ui/Pill";
import { RowActionLink } from "@/components/ui/RowAction";
import SortableHeader from "@/components/ui/SortableHeader";
import { dbConnect } from "@/lib/db";
import { Product, type ProductDoc } from "@/models/Product";
import { rupiah } from "@/lib/format";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { parseSort, mongoSort } from "@/lib/sort";
import type { HydratedDocument } from "mongoose";

export const dynamic = "force-dynamic";

const SORT_FIELDS = ["name", "sku", "hargaRekomendasi", "stok"] as const;

function stockPill(stok: number) {
  if (stok <= 0) return <Pill variant="out">Stok Habis</Pill>;
  if (stok <= LOW_STOCK_THRESHOLD) return <Pill variant="low">Stok Menipis</Pill>;
  return <Pill variant="ok">Tersedia</Pill>;
}

export default async function ProdukListPage({
  searchParams,
}: PageProps<"/produk">) {
  const sp = await searchParams;
  const { search } = sp;
  const { field, dir } = parseSort(sp, SORT_FIELDS, "name");
  await dbConnect();

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
      { merk: { $regex: search, $options: "i" } },
    ];
  }
  const products = (await Product.find(filter).sort(mongoSort(field, dir))) as HydratedDocument<ProductDoc>[];

  return (
    <Panel>
      <PanelHead title="Semua Produk">
        <form>
          <SearchInput name="search" defaultValue={search as string} placeholder="Cari produk atau SKU..." />
        </form>
      </PanelHead>
      <TableScroll>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <SortableHeader label="Produk" sortKey="name" currentSort={field} currentDir={dir} basePath="/produk" searchParams={sp} />
              <SortableHeader label="SKU" sortKey="sku" currentSort={field} currentDir={dir} basePath="/produk" searchParams={sp} />
              <SortableHeader label="Harga Rekomendasi" sortKey="hargaRekomendasi" currentSort={field} currentDir={dir} basePath="/produk" searchParams={sp} align="right" />
              <SortableHeader label="Stok" sortKey="stok" currentSort={field} currentDir={dir} basePath="/produk" searchParams={sp} align="right" />
              <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                Status
              </th>
              <th className="border-b border-line px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={String(p._id)} className="hover:bg-[#fbfaf5]">
                <td className="border-b border-line px-5 py-4.5">
                  <div className="font-medium">{p.name}</div>
                  <div className="font-mono text-[0.7rem] text-muted">
                    {p.category}
                    {p.merk ? ` · ${p.merk}` : ""}
                  </div>
                </td>
                <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{p.sku}</td>
                <td className="border-b border-line px-5 py-4.5 text-right font-mono text-[0.8rem]">
                  {rupiah(p.hargaRekomendasi)}
                </td>
                <td className="border-b border-line px-5 py-4.5 text-right font-mono text-[0.8rem]">{p.stok}</td>
                <td className="border-b border-line px-5 py-4.5">{stockPill(p.stok)}</td>
                <td className="border-b border-line px-5 py-4.5">
                  <RowActionLink href={`/produk/${p._id}/edit`}>Ubah</RowActionLink>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center font-mono text-sm text-muted">
                  Belum ada produk.{" "}
                  <Link href="/produk/baru" className="text-moss-deep underline">
                    Tambah produk pertama
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>
    </Panel>
  );
}
