import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import NavIcon from "@/components/layout/NavIcons";
import FollowUpStatusBadge from "@/components/dashboard/FollowUpStatusBadge";
import { dbConnect } from "@/lib/db";
import { currentPeriod, getSalesRanking } from "@/lib/insentif";
import { getFollowUpInvoices, getLowStockProducts } from "@/lib/dashboard";
import { getKeuanganSummary } from "@/lib/keuangan";
import { getActivityLog } from "@/lib/activity";
import { rupiah, rupiahCompact } from "@/lib/format";
import { currentJakartaMonthYear, jakartaMonthRange } from "@/lib/timezone";
import { MONTH_NAMES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** Beranda — task-based homepage ("1a" in the 2026-08-22 redesign): three big actions, then a unified "needs action" list, numbers kept for last. */
export default async function DashboardPage() {
  await dbConnect();
  const nowJakarta = currentJakartaMonthYear();
  const thisMonthRange = jakartaMonthRange(nowJakarta.year, nowJakarta.month);

  const [followUpAll, ranking, lowStock, keuangan, activity] = await Promise.all([
    getFollowUpInvoices(),
    getSalesRanking(currentPeriod()),
    getLowStockProducts(3),
    getKeuanganSummary(thisMonthRange),
    getActivityLog(50),
  ]);
  const recentActivityCount = activity.filter((a) => Date.now() - a.tanggal.getTime() < 24 * 60 * 60 * 1000).length;

  const draftCount = followUpAll.filter((i) => i.status === "draft").length;
  const unpaidCount = followUpAll.filter((i) => i.status === "unpaid").length;
  const needsAction = followUpAll.slice(0, lowStock.length > 0 ? 5 : 6);
  const totalNeedsAction = followUpAll.length + (lowStock.length > 0 ? 1 : 0);

  const penjualanBulanIni = ranking.reduce((s, r) => s + r.totalPenjualan, 0);
  const belumTertagih = followUpAll.filter((i) => i.status === "unpaid").reduce((s, i) => s + i.grandTotal, 0);
  const insentifTerkumpul = ranking.reduce((s, r) => s + r.totalKomisi, 0);

  return (
    <>
      <PageHeader
        title="Beranda"
        subtitle="Titik awal setiap hari. Pilih satu aksi di bawah, atau bereskan daftar yang perlu ditindak."
        actions={
          <Link
            href="/aktivitas"
            title="Aktivitas"
            className="relative flex h-9 w-9 items-center justify-center border border-line text-ink hover:border-accent hover:text-accent"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <path d="M10 3a5 5 0 0 1 5 5v3l1.5 3H3.5L5 11V8a5 5 0 0 1 5-5zM8 17h4" />
            </svg>
            {recentActivityCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 bg-accent px-1 text-[9.5px] font-bold text-white">
                {recentActivityCount}
              </span>
            )}
          </Link>
        }
      />

      <div className="px-6 pt-7 md:px-9">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <Link
            href="/penjualan"
            className="flex min-h-[132px] flex-col bg-accent p-5 text-white no-underline hover:bg-accent-600"
          >
            <NavIcon name="cart" size={20} />
            <div className="mt-auto">
              <div className="font-sans text-[1.2rem] font-extrabold tracking-tight">Jual barang</div>
              <div className="mt-1 font-sans text-[0.75rem] text-white/85">Pilih pelanggan → katalog → invoice</div>
            </div>
          </Link>
          <Link
            href="/invoice"
            className="flex min-h-[132px] flex-col border-2 border-ink bg-panel p-5 no-underline hover:border-accent"
          >
            <div className="flex items-start justify-between">
              <NavIcon name="document" size={20} />
              {(unpaidCount + draftCount) > 0 && (
                <span className="bg-ink px-1.5 py-0.5 text-[10.5px] font-bold text-white">
                  {unpaidCount + draftCount} nunggu
                </span>
              )}
            </div>
            <div className="mt-auto">
              <div className="font-sans text-[1.2rem] font-extrabold tracking-tight text-ink">Tagih invoice</div>
              <div className="mt-1 font-sans text-[0.75rem] text-muted">
                {unpaidCount} belum bayar · {draftCount} draft belum dikirim
              </div>
            </div>
          </Link>
          <Link
            href="/keuangan/transaksi"
            className="flex min-h-[132px] flex-col border border-line bg-panel p-5 no-underline hover:border-accent"
          >
            <NavIcon name="cashbox" size={20} />
            <div className="mt-auto">
              <div className="font-sans text-[1.2rem] font-extrabold tracking-tight text-ink">Catat uang</div>
              <div className="mt-1 font-sans text-[0.75rem] text-muted">Pemasukan atau pengeluaran toko</div>
            </div>
          </Link>
        </div>
      </div>

      <div className="px-6 pt-8 pb-6 md:px-9">
        <div className="flex items-baseline justify-between gap-2.5 border-b-2 border-ink pb-2.5">
          <div className="font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
            Perlu ditindak — {totalNeedsAction} hal
          </div>
          <Link href="/follow-up" className="font-sans text-[0.75rem] text-accent no-underline hover:underline">
            lihat semua →
          </Link>
        </div>

        {needsAction.map((inv) => (
          <div
            key={inv.invoiceId}
            className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-line py-3.5"
          >
            <div className="flex items-center gap-3">
              <FollowUpStatusBadge status={inv.status} />
              <div>
                <div className="font-sans text-[0.95rem] font-bold">{inv.customerNama}</div>
                <div className="mt-0.5 font-sans text-[0.75rem] text-muted">
                  {inv.nomor} · {rupiah(inv.grandTotal)} · sales {inv.salesNama}
                </div>
              </div>
            </div>
            <Link
              href={inv.status === "draft" ? `/invoice/${inv.invoiceId}/ubah` : `/invoice/${inv.invoiceId}`}
              className="border border-accent px-3 py-1.5 font-sans text-[0.7rem] font-semibold text-accent no-underline hover:bg-accent hover:text-white"
            >
              {inv.status === "draft" ? "Lanjutkan" : "Lihat"}
            </Link>
          </div>
        ))}

        {lowStock.length > 0 && (
          <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-line py-3.5">
            <div className="flex items-center gap-3">
              <span className="border border-line px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide text-muted">
                Stok
              </span>
              <div>
                <div className="font-sans text-[0.95rem] font-bold">
                  {lowStock.length} produk stoknya menipis
                </div>
                <div className="mt-0.5 font-sans text-[0.75rem] text-muted">
                  {lowStock.map((p) => p.name).join(" · ")}
                </div>
              </div>
            </div>
            <Link
              href="/produk"
              className="border border-line px-3 py-1.5 font-sans text-[0.7rem] font-semibold text-ink no-underline hover:border-accent hover:text-accent"
            >
              Lihat inventory
            </Link>
          </div>
        )}

        {needsAction.length === 0 && lowStock.length === 0 && (
          <div className="border-b border-line py-8 text-center font-sans text-sm text-muted">
            Tidak ada yang perlu ditindak. 🎉
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6 border-t-2 border-ink bg-panel px-6 py-5 md:grid-cols-4 md:px-9">
        <div>
          <div className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Penjualan {MONTH_NAMES[nowJakarta.month - 1]}
          </div>
          <div className="mt-1 font-sans text-[1.35rem] font-extrabold tracking-tight">
            {rupiahCompact(penjualanBulanIni)}
          </div>
        </div>
        <div>
          <div className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Belum tertagih
          </div>
          <div className="mt-1 font-sans text-[1.35rem] font-extrabold tracking-tight text-accent">
            {rupiahCompact(belumTertagih)}
          </div>
        </div>
        <div>
          <div className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Kas bersih bulan ini
          </div>
          <div className="mt-1 font-sans text-[1.35rem] font-extrabold tracking-tight">
            {rupiahCompact(keuangan.netTotal)}
          </div>
        </div>
        <div>
          <div className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Insentif terkumpul
          </div>
          <div className="mt-1 font-sans text-[1.35rem] font-extrabold tracking-tight">
            {rupiahCompact(insentifTerkumpul)}
          </div>
        </div>
      </div>
    </>
  );
}
