import { Panel, PanelHead, SearchInput, TableScroll } from "@/components/ui/Panel";
import Pill from "@/components/ui/Pill";
import SortableHeader from "@/components/ui/SortableHeader";
import { dbConnect } from "@/lib/db";
import { StockMovement } from "@/models/StockMovement";
import { Product } from "@/models/Product";
import { formatDateShort } from "@/lib/format";
import { parseSort, mongoSort } from "@/lib/sort";
import { getEffectiveKomisiInfo, KOMISI_SOURCE_LABEL } from "@/lib/commission";
import { getKategoriKomisiBekasMap } from "@/lib/katalog";

export const dynamic = "force-dynamic";

const SORT_FIELDS = ["tanggal", "productNameSnapshot", "tipe", "komisiPercent", "qty", "alasan", "invoiceNomorSnapshot", "salesSnapshot", "tanggalKirim", "kurir"] as const;

export default async function ProdukRiwayatPage({ searchParams }: PageProps<"/produk/riwayat">) {
  const sp = await searchParams;
  const { search } = sp;
  const { field, dir } = parseSort(sp, SORT_FIELDS, "tanggal");
  await dbConnect();

  const filter: Record<string, unknown> = {};
  if (search) filter.productNameSnapshot = { $regex: search, $options: "i" };

  // "% Komisi" isn't a real StockMovement field — resolved per movement
  // from its product's kondisi/override/category, so it can't go through
  // mongoSort() like the others. Fetched with the default (tanggal desc)
  // order, then sorted in-memory below once komisiPercent is computed —
  // per the user's request 2026-09-19 ("kamu harus berikan button untuk
  // sort, di setiap header tablenya").
  const isKomisiSort = field === "komisiPercent";
  const movementsRaw = await StockMovement.find(filter)
    .sort(isKomisiSort ? { tanggal: -1 } : mongoSort(field, dir))
    .limit(200);

  // Baru/Bekas label + % Komisi next to Tipe — per the user's requests
  // 2026-09-19 ("supaya terlihat" / "tambahkan tabel % Komisi"). Both read
  // live off Product (not snapshotted on StockMovement) since kondisi and
  // the komisi-bekas override are slow-changing product attributes, same
  // reasoning as app/invoice/page.tsx's live salesPhoneByNama lookup — the
  // % shown here is CURRENT, not necessarily what applied at the time of
  // that movement if the product's commission settings changed since.
  const productIds = [...new Set(movementsRaw.map((m) => String(m.product)))];
  const [products, kategoriKomisiBekasMap] = await Promise.all([
    Product.find({ _id: { $in: productIds } }).select("kondisi komisiBekasPercent category").lean(),
    getKategoriKomisiBekasMap(),
  ]);
  const productById = new Map(products.map((p) => [String(p._id), p]));

  const komisiPercentByMovementId = new Map(
    movementsRaw.map((m) => {
      const product = productById.get(String(m.product));
      const percent = product
        ? getEffectiveKomisiInfo(
            product.kondisi as "baru" | "bekas" | undefined,
            product.komisiBekasPercent,
            kategoriKomisiBekasMap.get(product.category)
          ).percent
        : -1; // no matching product — sorts to the bottom (ascending) either way
      return [String(m._id), percent];
    })
  );

  const movements = isKomisiSort
    ? [...movementsRaw].sort((a, b) => {
        const av = komisiPercentByMovementId.get(String(a._id))!;
        const bv = komisiPercentByMovementId.get(String(b._id))!;
        return dir === "asc" ? av - bv : bv - av;
      })
    : movementsRaw;

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
    </Panel>
  );
}
