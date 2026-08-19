import PageHeader from "@/components/layout/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import Pill from "@/components/ui/Pill";
import { LinkButton } from "@/components/ui/Button";
import SortableHeader from "@/components/ui/SortableHeader";
import CashFlowChart from "@/components/keuangan/CashFlowChart";
import { getKeuanganSummary } from "@/lib/keuangan";
import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { CashflowEntry } from "@/models/CashflowEntry";
import { rupiah, rupiahCompact, formatDateShort } from "@/lib/format";
import { parseSort, mongoSort } from "@/lib/sort";

export const dynamic = "force-dynamic";

const STOK_SORT_FIELDS = ["name", "stok", "hargaRekomendasi", "hargaBeli"] as const;
const KAS_SORT_FIELDS = ["tanggal", "tipe", "keterangan", "referensi", "nominal"] as const;

export default async function KeuanganPage({ searchParams }: PageProps<"/keuangan">) {
  const sp = await searchParams;
  await dbConnect();
  const summary = await getKeuanganSummary();

  const { field: stokField, dir: stokDir } = parseSort(sp, STOK_SORT_FIELDS, "stok", "stok");
  const hasStokSort = typeof sp.stoksort === "string";
  const products = await Product.find().sort(hasStokSort ? mongoSort(stokField, stokDir) : { stok: -1 }).lean();

  const { field: kasField, dir: kasDir } = parseSort(sp, KAS_SORT_FIELDS, "tanggal", "kas");
  const hasKasSort = typeof sp.kassort === "string";
  const riwayat = await CashflowEntry.find()
    .sort(hasKasSort ? mongoSort(kasField, kasDir) : { tanggal: -1 })
    .limit(50);

  return (
    <>
      <PageHeader
        title="Keuangan"
        subtitle="RINGKASAN ARUS KAS & NILAI STOK · BULAN INI"
        actions={<LinkButton href="/keuangan/pengeluaran">+ Catat Pengeluaran</LinkButton>}
      />
      <div className="p-6 md:p-9">
        <div className="mb-5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <StatCard
            label="Uang Masuk (bulan ini)"
            value={rupiahCompact(summary.masukTotal)}
            accent="teal"
            deltaTone="up"
            delta="dari pembayaran invoice lunas"
          />
          <StatCard
            label="Uang Keluar (bulan ini)"
            value={rupiahCompact(summary.keluarTotal)}
            accent="clay"
            deltaTone="warn"
            delta="untuk pembelian/restock barang"
          />
          <StatCard
            label="Arus Kas Bersih"
            value={rupiahCompact(summary.netTotal)}
            accent="violet"
            deltaTone="violet"
            delta="masuk − keluar bulan ini"
          />
          <StatCard
            label="Nilai Stok di Gudang"
            value={rupiahCompact(summary.nilaiStok)}
            accent="gold"
            deltaTone="gold"
            delta={`${summary.productCount} produk, harga jual saat ini`}
          />
        </div>

        <Panel className="mb-5">
          <PanelHead title="Arus Kas — Uang Masuk & Uang Keluar" />
          <CashFlowChart
            masukTotal={summary.masukTotal}
            keluarTotal={summary.keluarTotal}
            netTotal={summary.netTotal}
            nodes={summary.nodes}
          />
        </Panel>

        <Panel className="mb-5">
          <PanelHead title="Stock on Hand — nilai per produk" />
          <TableScroll>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <SortableHeader label="Produk" sortKey="name" currentSort={stokField} currentDir={stokDir} basePath="/keuangan" searchParams={sp} paramPrefix="stok" />
                  <SortableHeader label="Stok" sortKey="stok" currentSort={stokField} currentDir={stokDir} basePath="/keuangan" searchParams={sp} paramPrefix="stok" />
                  <SortableHeader label="Harga Rekomendasi" sortKey="hargaRekomendasi" currentSort={stokField} currentDir={stokDir} basePath="/keuangan" searchParams={sp} paramPrefix="stok" />
                  <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                    Nilai Stok
                  </th>
                  <SortableHeader label="Harga Beli" sortKey="hargaBeli" currentSort={stokField} currentDir={stokDir} basePath="/keuangan" searchParams={sp} paramPrefix="stok" />
                  <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                    Modal Tertanam
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={String(p._id)} className="hover:bg-[#fbfaf5]">
                    <td className="border-b border-line px-5 py-4.5 font-medium">{p.name}</td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{p.stok}</td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                      {rupiah(p.hargaRekomendasi)}
                    </td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                      {rupiah(p.stok * p.hargaRekomendasi)}
                    </td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                      {rupiah(p.hargaBeli)}
                    </td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                      {rupiah(p.stok * p.hargaBeli)}
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center font-mono text-sm text-muted">
                      Belum ada produk.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableScroll>
        </Panel>

        <Panel>
          <PanelHead title="Riwayat arus kas" />
          <TableScroll>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <SortableHeader label="Tanggal" sortKey="tanggal" currentSort={kasField} currentDir={kasDir} basePath="/keuangan" searchParams={sp} paramPrefix="kas" />
                  <SortableHeader label="Tipe" sortKey="tipe" currentSort={kasField} currentDir={kasDir} basePath="/keuangan" searchParams={sp} paramPrefix="kas" />
                  <SortableHeader label="Keterangan" sortKey="keterangan" currentSort={kasField} currentDir={kasDir} basePath="/keuangan" searchParams={sp} paramPrefix="kas" />
                  <SortableHeader label="Referensi" sortKey="referensi" currentSort={kasField} currentDir={kasDir} basePath="/keuangan" searchParams={sp} paramPrefix="kas" />
                  <SortableHeader label="Nominal" sortKey="nominal" currentSort={kasField} currentDir={kasDir} basePath="/keuangan" searchParams={sp} paramPrefix="kas" />
                </tr>
              </thead>
              <tbody>
                {riwayat.map((r) => (
                  <tr key={String(r._id)} className="hover:bg-[#fbfaf5]">
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                      {formatDateShort(r.tanggal ?? r.createdAt!)}
                    </td>
                    <td className="border-b border-line px-5 py-4.5">
                      {r.tipe === "masuk" ? <Pill variant="ok">Masuk</Pill> : <Pill variant="out">Keluar</Pill>}
                    </td>
                    <td className="border-b border-line px-5 py-4.5">{r.keterangan}</td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{r.referensi ?? "—"}</td>
                    <td
                      className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]"
                      style={{ color: r.tipe === "masuk" ? "#087a52" : "var(--color-clay)" }}
                    >
                      {r.tipe === "masuk" ? "+" : "−"}
                      {rupiah(r.nominal)}
                    </td>
                  </tr>
                ))}
                {riwayat.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center font-mono text-sm text-muted">
                      Belum ada riwayat arus kas.
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
