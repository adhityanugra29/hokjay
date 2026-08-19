import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import SortableHeader from "@/components/ui/SortableHeader";
import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { rupiah } from "@/lib/format";
import { parseSort, sortRows } from "@/lib/sort";

export const dynamic = "force-dynamic";

const SORT_FIELDS = ["kategori", "jumlahProduk", "totalStok", "nilaiStok"] as const;

interface CategoryRow {
  kategori: string;
  jumlahProduk: number;
  totalStok: number;
  nilaiStok: number;
}

export default async function ProdukKategoriPage({ searchParams }: PageProps<"/produk/kategori">) {
  const sp = await searchParams;
  const { field, dir } = parseSort(sp, SORT_FIELDS, "kategori");
  await dbConnect();

  const raw: { _id: string; jumlahProduk: number; totalStok: number; nilaiStok: number }[] = await Product.aggregate([
    {
      $group: {
        _id: "$category",
        jumlahProduk: { $sum: 1 },
        totalStok: { $sum: "$stok" },
        nilaiStok: { $sum: { $multiply: ["$stok", "$hargaRekomendasi"] } },
      },
    },
  ]);
  const rows = sortRows(
    raw.map((r) => ({ kategori: r._id, jumlahProduk: r.jumlahProduk, totalStok: r.totalStok, nilaiStok: r.nilaiStok })),
    field,
    dir
  );

  return (
    <Panel>
      <PanelHead title="Produk per kategori" />
      <TableScroll>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <SortableHeader label="Kategori" sortKey="kategori" currentSort={field} currentDir={dir} basePath="/produk/kategori" searchParams={sp} />
              <SortableHeader label="Jumlah Produk" sortKey="jumlahProduk" currentSort={field} currentDir={dir} basePath="/produk/kategori" searchParams={sp} align="right" />
              <SortableHeader label="Total Stok" sortKey="totalStok" currentSort={field} currentDir={dir} basePath="/produk/kategori" searchParams={sp} align="right" />
              <SortableHeader label="Nilai Stok (harga jual)" sortKey="nilaiStok" currentSort={field} currentDir={dir} basePath="/produk/kategori" searchParams={sp} align="right" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.kategori} className="hover:bg-[#fbfaf5]">
                <td className="border-b border-line px-5 py-4.5 font-medium">{r.kategori}</td>
                <td className="border-b border-line px-5 py-4.5 text-right font-mono text-[0.8rem]">
                  {r.jumlahProduk}
                </td>
                <td className="border-b border-line px-5 py-4.5 text-right font-mono text-[0.8rem]">
                  {r.totalStok} unit
                </td>
                <td className="border-b border-line px-5 py-4.5 text-right font-mono text-[0.8rem]">
                  {rupiah(r.nilaiStok)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center font-mono text-sm text-muted">
                  Belum ada data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>
    </Panel>
  );
}
