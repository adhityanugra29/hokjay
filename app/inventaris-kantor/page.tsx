import PageHeader from "@/components/layout/PageHeader";
import OfficeAssetManager from "@/components/inventaris/OfficeAssetManager";
import { dbConnect } from "@/lib/db";
import { PurchaseBill } from "@/models/PurchaseBill";
import { getInventarisSummary } from "@/lib/inventaris";
import { rupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Standalone module, separated out from Purchasing per the user's request
 * 2026-08-23. Redesigned "6c" 2026-08-24 — aset, bukan stok jual: siapa
 * pegang, kondisinya, dan nilai bukunya sekarang.
 */
export default async function InventarisKantorPage({
  searchParams,
}: PageProps<"/inventaris-kantor">) {
  const sp = await searchParams;
  const billId = typeof sp.billId === "string" ? sp.billId : undefined;

  await dbConnect();
  const [bill, summary] = await Promise.all([
    billId ? PurchaseBill.findById(billId).lean() : null,
    getInventarisSummary(),
  ]);

  return (
    <>
      <PageHeader
        title="Inventaris Kantor"
        subtitle="Barang milik perusahaan yang dipakai sendiri — terpisah dari stok dagang di Inventory."
      />
      <div className="p-6 md:p-9">
        <div className="mb-6 grid grid-cols-2 border-2 border-ink bg-panel lg:grid-cols-4">
          <div className="min-w-0 border-b border-r border-line p-4 sm:p-5 lg:border-b-0">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Jumlah aset
            </div>
            <div className="mt-1.5 font-sans text-[1.15rem] font-extrabold sm:text-[1.4rem]">{summary.jumlahAset} unit</div>
            <div className="mt-1 font-mono text-[0.7rem] text-muted">{summary.kategoriCount} kategori</div>
          </div>
          <div className="min-w-0 border-b border-line p-4 sm:p-5 lg:border-b-0 lg:border-r">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Harga beli total
            </div>
            <div className="mt-1.5 font-sans text-[1.1rem] font-extrabold sm:whitespace-nowrap sm:text-[1.4rem]">
              {rupiah(summary.hargaBeliTotal)}
            </div>
          </div>
          <div className="min-w-0 border-r border-line p-4 sm:p-5">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Nilai buku sekarang
            </div>
            <div className="mt-1.5 font-sans text-[1.1rem] font-extrabold sm:whitespace-nowrap sm:text-[1.4rem]">
              {rupiah(summary.nilaiBukuTotal)}
            </div>
            <div className="mt-1 font-mono text-[0.7rem] text-muted">
              penyusutan bulan ini {rupiah(summary.penyusutanBulanIni)}
            </div>
          </div>
          <div className="min-w-0 bg-ink p-4 text-white sm:p-5">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
              Perlu tindakan
            </div>
            <div className="mt-1.5 font-sans text-[1.15rem] font-extrabold sm:text-[1.4rem]">{summary.perluTindakanCount} unit</div>
            <div className="mt-1 font-mono text-[0.7rem] text-white/55">
              {summary.servisCount} servis · {summary.rusakCount} rusak
            </div>
          </div>
        </div>

        <OfficeAssetManager
          prefillFromBill={
            bill
              ? { _id: String(bill._id), nomor: bill.nomor, namaBarang: bill.namaBarang, qty: bill.qty, totalTagihan: bill.totalTagihan }
              : undefined
          }
        />
      </div>
    </>
  );
}
