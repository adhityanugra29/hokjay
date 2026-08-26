import Link from "next/link";
import { Panel, PanelHead, SearchInput, TableScroll } from "@/components/ui/Panel";
import Pill from "@/components/ui/Pill";
import { RowActionLink } from "@/components/ui/RowAction";
import DeleteProductButton from "@/components/produk/DeleteProductButton";
import SortableHeader from "@/components/ui/SortableHeader";
import MobileProdukList from "@/components/produk/MobileProdukList";
import { dbConnect } from "@/lib/db";
import { Product, type ProductDoc } from "@/models/Product";
import { rupiah } from "@/lib/format";
import { parseSort, mongoSort } from "@/lib/sort";
import type { HydratedDocument } from "mongoose";

export const dynamic = "force-dynamic";

const SORT_FIELDS = ["name", "sku", "hargaRekomendasi", "stok", "tanggalBarangMasuk"] as const;

/**
 * "Umur Stok" (stock age) — replaces the old quantity-based Stok
 * Menipis/Habis pill per the user's request 2026-08-25: track how long a
 * unit has been sitting in the warehouse instead of just how many are
 * left. Ages off `tanggalBarangMasuk`; falls back to `createdAt` for
 * products entered before that field existed. Reuses the schema's
 * existing (previously dormant — see ProductForm.tsx's EMPTY_BASE
 * comment) `alertHariTidakTerjual` as the "this has been sitting too
 * long" threshold, so the two features tie together instead of adding a
 * second, unrelated number.
 */
// Split into a plain-data step (shared with MobileProdukList's cards) and a
// thin <Pill> wrapper for the desktop table, so both read exactly the same
// day-math instead of duplicating it.
function stockAgeInfo(referenceDate: Date, alertHari: number): { label: string; variant: "ok" | "low" | "out" } {
  const umurHari = Math.max(0, Math.floor((Date.now() - referenceDate.getTime()) / 86_400_000));
  const label = `${umurHari} hari`;
  if (umurHari >= alertHari) return { label: `${label} · Lama`, variant: "out" };
  if (umurHari >= alertHari * 0.7) return { label, variant: "low" };
  return { label, variant: "ok" };
}
function stockAgePill(referenceDate: Date, alertHari: number) {
  const { label, variant } = stockAgeInfo(referenceDate, alertHari);
  return <Pill variant={variant}>{label}</Pill>;
}

export default async function ProdukListPage({
  searchParams,
}: PageProps<"/produk">) {
  const sp = await searchParams;
  const { search } = sp;
  const { field, dir } = parseSort(sp, SORT_FIELDS, "name");
  await dbConnect();

  // Sold-out products (stok <= 0) no longer show in Inventory's browsing
  // list — per the user's request 2026-08-25. Nothing is deleted (the
  // Product doc, and every snapshot of it on past invoices, is untouched);
  // this is purely a display filter here.
  const filter: Record<string, unknown> = { stok: { $gt: 0 } };
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
        <form className="w-full sm:w-auto">
          <SearchInput name="search" defaultValue={search as string} placeholder="Cari produk atau SKU..." />
        </form>
      </PanelHead>
      {/* Mobile card list below md; the <table> (horizontal-scroll fallback
          only, TableScroll) takes over at md+. Per the user's request
          2026-08-25. */}
      <MobileProdukList
        products={products.map((p) => {
          const { label, variant } = stockAgeInfo(p.tanggalBarangMasuk ?? p.createdAt!, p.alertHariTidakTerjual ?? 45);
          return {
            id: String(p._id),
            name: p.name,
            category: p.category,
            merk: p.merk ?? undefined,
            sku: p.sku,
            hargaRekomendasi: p.hargaRekomendasi,
            stok: p.stok,
            kondisi: p.kondisi ?? "baru",
            umurStokLabel: label,
            umurStokVariant: variant,
          };
        })}
      />
      <div className="hidden md:block">
        <TableScroll>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <SortableHeader label="Produk" sortKey="name" currentSort={field} currentDir={dir} basePath="/produk" searchParams={sp} />
                <SortableHeader label="SKU" sortKey="sku" currentSort={field} currentDir={dir} basePath="/produk" searchParams={sp} />
                <SortableHeader label="Harga Rekomendasi" sortKey="hargaRekomendasi" currentSort={field} currentDir={dir} basePath="/produk" searchParams={sp} align="right" />
                <SortableHeader label="Stok" sortKey="stok" currentSort={field} currentDir={dir} basePath="/produk" searchParams={sp} align="right" />
                <SortableHeader label="Umur Stok" sortKey="tanggalBarangMasuk" currentSort={field} currentDir={dir} basePath="/produk" searchParams={sp} />
                <th className="border-b border-line px-5 py-4" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={String(p._id)} className="hover:bg-[#fbfaf5]">
                  <td className="border-b border-line px-5 py-4.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      {/* Just "Bekas"/"Baru", filled bright color — per the
                          user's request 2026-08-25. */}
                      <span
                        className="shrink-0 px-1.5 py-0.5 text-[0.6rem] font-semibold whitespace-nowrap text-white"
                        style={{ background: p.kondisi === "bekas" ? "#D97706" : "#16A34A" }}
                      >
                        {p.kondisi === "bekas" ? "Bekas" : "Baru"}
                      </span>
                    </div>
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
                  <td className="border-b border-line px-5 py-4.5">
                    {stockAgePill(p.tanggalBarangMasuk ?? p.createdAt!, p.alertHariTidakTerjual ?? 45)}
                  </td>
                  <td className="border-b border-line px-5 py-4.5">
                    <div className="flex flex-wrap gap-2">
                      <RowActionLink href={`/produk/${p._id}/edit`}>Ubah</RowActionLink>
                      <DeleteProductButton productId={String(p._id)} productName={p.name} />
                    </div>
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
      </div>
    </Panel>
  );
}
