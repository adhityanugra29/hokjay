import { Panel, PanelHead, SearchInput, TableScroll } from "@/components/ui/Panel";
import Form from "next/form";
import Pill from "@/components/ui/Pill";
import SortableHeader from "@/components/ui/SortableHeader";
import { dbConnect } from "@/lib/db";
import { StockMovement } from "@/models/StockMovement";
import { Product } from "@/models/Product";
import { formatDateShort } from "@/lib/format";
import { parseSort, mongoSort } from "@/lib/sort";
import { parsePage, clampPageOrRedirect } from "@/lib/pagination";
import Pagination from "@/components/ui/Pagination";
import { getEffectiveKomisiInfo, KOMISI_SOURCE_LABEL } from "@/lib/commission";
import { getKategoriKomisiBekasMap } from "@/lib/katalog";

export const dynamic = "force-dynamic";

const SORT_FIELDS = ["tanggal", "productNameSnapshot", "tipe", "komisiPercent", "qty", "alasan", "invoiceNomorSnapshot", "salesSnapshot", "tanggalKirim", "kurir"] as const;

export default async function ProdukRiwayatPage({ searchParams }: PageProps<"/produk/riwayat">) {
  const sp = await searchParams;
  const { search } = sp;
  const { field, dir } = parseSort(sp, SORT_FIELDS, "tanggal");
  const { page, pageSize, skip } = parsePage(sp);
  await dbConnect();

  const filter: Record<string, unknown> = {};
  if (search) filter.productNameSnapshot = { $regex: search, $options: "i" };

  const kategoriKomisiBekasMap = await getKategoriKomisiBekasMap();
  const productSelect = "kondisi komisiBekasPercent category";

  // "% Komisi" isn't a real StockMovement field: it is resolved per movement from its product's kondisi/override/category, so it can't go through
  // mongoSort() like the other columns. For that one sort, order the WHOLE filtered history by it using only (_id, product) pairs, then load the full
  // rows of just the current page. Every other sort is a plain indexed skip/limit query.
  let movements;
  let total: number;
  if (field === "komisiPercent") {
    const slim = await StockMovement.find(filter).select("product").sort({ tanggal: -1, _id: -1 }).lean();
    total = slim.length;
    const everyProduct = await Product.find({ _id: { $in: [...new Set(slim.map((m) => String(m.product)))] } })
      .select(productSelect)
      .lean();
    const percentByProduct = new Map(
      everyProduct.map((p) => [
        String(p._id),
        getEffectiveKomisiInfo(p.kondisi as "baru" | "bekas" | undefined, p.komisiBekasPercent, kategoriKomisiBekasMap.get(p.category)).percent,
      ])
    );
    // No matching product = -1, which sorts to the bottom (ascending) either way, as before.
    const sign = dir === "asc" ? 1 : -1;
    const ordered = [...slim].sort(
      (a, b) => sign * ((percentByProduct.get(String(a.product)) ?? -1) - (percentByProduct.get(String(b.product)) ?? -1))
    );
    const pageIds = ordered.slice(skip, skip + pageSize).map((m) => m._id);
    const docs = await StockMovement.find({ _id: { $in: pageIds } });
    const byId = new Map(docs.map((d) => [String(d._id), d]));
    movements = pageIds.map((id) => byId.get(String(id))).filter((d): d is NonNullable<typeof d> => !!d);
  } else {
    const sortStage = { ...mongoSort(field, dir), _id: dir === "asc" ? (1 as const) : (-1 as const) }; // _id keeps page boundaries stable
    const [rows, count] = await Promise.all([
      StockMovement.find(filter).sort(sortStage).skip(skip).limit(pageSize),
      StockMovement.countDocuments(filter),
    ]);
    movements = rows;
    total = count;
  }
  clampPageOrRedirect("/produk/riwayat", sp, page, total, pageSize);

  // Baru/Bekas label + % Komisi next to Tipe read live off Product (not snapshotted on StockMovement): kondisi and the komisi-bekas override are
  // slow-changing product attributes, so the % shown is CURRENT, not necessarily what applied when that movement happened.
  const pageProducts = await Product.find({ _id: { $in: [...new Set(movements.map((m) => String(m.product)))] } })
    .select(productSelect)
    .lean();
  const productById = new Map(pageProducts.map((p) => [String(p._id), p]));

  const basePath = "/produk/riwayat";
  const headers: { label: string; key: (typeof SORT_FIELDS)[number]; align?: "right"; className?: string }[] = [
    { label: "Tanggal", key: "tanggal" },
    { label: "Produk", key: "productNameSnapshot" },
    { label: "Tipe", key: "tipe" },
    { label: "% Komisi", key: "komisiPercent", className: "bg-accent-100 text-accent-700" },
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
        <Form action="/produk/riwayat" className="w-full sm:w-auto">
          <SearchInput name="search" defaultValue={search as string} placeholder="Cari produk..." />
        </Form>
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
                  className={h.className}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={String(m._id)} className="transition hover:bg-surface">
                <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                  {formatDateShort(m.tanggal)}
                </td>
                <td className="border-b border-line px-5 py-4.5">{m.productNameSnapshot}</td>
                <td className="border-b border-line px-5 py-4.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {m.tipe === "masuk" ? <Pill variant="ok">Masuk</Pill> : <Pill variant="out">Keluar</Pill>}
                    {(() => {
                      const kondisi = productById.get(String(m.product))?.kondisi;
                      if (!kondisi) return null;
                      return (
                        <span
                          className="inline-block px-2.5 py-1 font-sans text-[0.68rem] font-semibold text-white"
                          style={{ background: kondisi === "bekas" ? "#D97706" : "#16A34A" }}
                        >
                          {kondisi === "bekas" ? "Bekas" : "Baru"}
                        </span>
                      );
                    })()}
                  </div>
                </td>
                <td className="border-b border-line bg-accent-100/40 px-5 py-4.5">
                  {(() => {
                    const product = productById.get(String(m.product));
                    if (!product) return <span className="font-mono text-[0.8rem] text-muted">—</span>;
                    const komisiInfo = getEffectiveKomisiInfo(
                      product.kondisi as "baru" | "bekas" | undefined,
                      product.komisiBekasPercent,
                      kategoriKomisiBekasMap.get(product.category)
                    );
                    return (
                      <>
                        <div className="font-semibold">{komisiInfo.percent}%</div>
                        <div className="font-mono text-[0.62rem] text-muted">{KOMISI_SOURCE_LABEL[komisiInfo.source]}</div>
                      </>
                    );
                  })()}
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
                <td colSpan={10} className="px-5 py-8 text-center font-mono text-sm text-muted">
                  Belum ada riwayat stok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>
      <Pagination basePath={basePath} searchParams={sp} page={page} pageSize={pageSize} total={total} />
    </Panel>
  );
}
