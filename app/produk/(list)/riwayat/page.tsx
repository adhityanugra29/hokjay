import { Panel, PanelHead, SearchInput, TableScroll } from "@/components/ui/Panel";
import Pill from "@/components/ui/Pill";
import SortableHeader from "@/components/ui/SortableHeader";
import { dbConnect } from "@/lib/db";
import { StockMovement } from "@/models/StockMovement";
import { formatDateShort } from "@/lib/format";
import { parseSort, mongoSort } from "@/lib/sort";

export const dynamic = "force-dynamic";

const SORT_FIELDS = ["tanggal", "productNameSnapshot", "tipe", "qty", "alasan", "invoiceNomorSnapshot", "salesSnapshot", "tanggalKirim", "kurir"] as const;

export default async function ProdukRiwayatPage({ searchParams }: PageProps<"/produk/riwayat">) {
  const sp = await searchParams;
  const { search } = sp;
  const { field, dir } = parseSort(sp, SORT_FIELDS, "tanggal");
  await dbConnect();

  const filter: Record<string, unknown> = {};
  if (search) filter.productNameSnapshot = { $regex: search, $options: "i" };

  const movements = await StockMovement.find(filter).sort(mongoSort(field, dir)).limit(200);

  const basePath = "/produk/riwayat";
  const headers: { label: string; key: (typeof SORT_FIELDS)[number]; align?: "right" }[] = [
    { label: "Tanggal", key: "tanggal" },
    { label: "Produk", key: "productNameSnapshot" },
    { label: "Tipe", key: "tipe" },
    { label: "Jumlah", key: "qty", align: "right" },
    { label: "Alasan", key: "alasan" },
    { label: "Referensi", key: "invoiceNomorSnapshot" },
    { label: "Sales", key: "salesSnapshot" },
    { label: "Tgl. Kirim", key: "tanggalKirim" },
    { label: "Kurir", key: "kurir" },
  ];

  return (
    <Panel>
      <PanelHead title="Riwayat stok masuk & keluar">
        <form className="w-full sm:w-auto">
          <SearchInput name="search" defaultValue={search as string} placeholder="Cari produk..." />
        </form>
      </PanelHead>
      <TableScroll>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {headers.map((h) => (
                <SortableHeader
                  key={h.key}
                  label={h.label}
                  sortKey={h.key}
                  currentSort={field}
                  currentDir={dir}
                  basePath={basePath}
                  searchParams={sp}
                  align={h.align}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={String(m._id)} className="hover:bg-[#fbfaf5]">
                <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                  {formatDateShort(m.tanggal)}
                </td>
                <td className="border-b border-line px-5 py-4.5">{m.productNameSnapshot}</td>
                <td className="border-b border-line px-5 py-4.5">
                  {m.tipe === "masuk" ? <Pill variant="ok">Masuk</Pill> : <Pill variant="out">Keluar</Pill>}
                </td>
                <td className="border-b border-line px-5 py-4.5 text-right font-mono text-[0.8rem]">
                  {m.tipe === "masuk" ? "+" : "-"}
                  {m.qty}
                </td>
                <td className="border-b border-line px-5 py-4.5">{m.alasan}</td>
                <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                  {m.invoiceNomorSnapshot ?? "—"}
                </td>
                <td className="border-b border-line px-5 py-4.5">{m.salesSnapshot ?? "—"}</td>
                <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                  {m.tanggalKirim ? formatDateShort(m.tanggalKirim) : "—"}
                </td>
                <td className="border-b border-line px-5 py-4.5">{m.kurir ?? "—"}</td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-8 text-center font-mono text-sm text-muted">
                  Belum ada riwayat stok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>
    </Panel>
  );
}
