import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import PeriodPicker from "@/components/ui/PeriodPicker";
import { getKeuanganSummary, getCashBook, getCurrentCashBalance } from "@/lib/keuangan";
import { getFollowUpInvoices } from "@/lib/dashboard";
import { dbConnect } from "@/lib/db";
import { rupiah, rupiahCompact, formatDateShort } from "@/lib/format";
import { currentJakartaMonthYear, jakartaMonthRange } from "@/lib/timezone";
import { MONTH_NAMES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** Keuangan — cash-book with a running balance ("2a" in the 2026-08-22 redesign, replacing the flow-chart version). */
export default async function KeuanganPage({ searchParams }: PageProps<"/keuangan">) {
  const sp = await searchParams;
  await dbConnect();
  const nowJakarta = currentJakartaMonthYear();
  const month = Number(sp.bulan) || nowJakarta.month;
  const year = Number(sp.tahun) || nowJakarta.year;
  const range = jakartaMonthRange(year, month);
  const tipeFilter = sp.tipe === "masuk" || sp.tipe === "keluar" ? sp.tipe : undefined;

  const [summary, cashBook, saldoHariIni, followUp] = await Promise.all([
    getKeuanganSummary(range),
    getCashBook(range),
    getCurrentCashBalance(),
    getFollowUpInvoices(),
  ]);

  const piutang = followUp.filter((i) => i.status === "unpaid");
  const totalPiutang = piutang.reduce((s, i) => s + i.grandTotal, 0);
  const tertuaHari = piutang.length > 0 ? Math.max(...piutang.map((i) => i.hariBerjalan)) : 0;

  const displayedRows = cashBook.rows.filter((r) => {
    if (r.isOpeningRow) return true;
    if (!tipeFilter) return true;
    return tipeFilter === "masuk" ? r.masuk !== undefined : r.keluar !== undefined;
  });

  function tipeLink(tipe?: "masuk" | "keluar") {
    const params = new URLSearchParams();
    params.set("bulan", String(month));
    params.set("tahun", String(year));
    if (tipe) params.set("tipe", tipe);
    return `/keuangan?${params.toString()}`;
  }

  return (
    <>
      <PageHeader
        title="Keuangan"
        subtitle="Uang yang benar-benar keluar-masuk kas toko, urut tanggal. Kolom paling kanan adalah sisa kas setelah transaksi itu."
        actions={
          <>
            <LinkButton href="/keuangan/transaksi?tipe=masuk" variant="ghost">
              + Pemasukan
            </LinkButton>
            <LinkButton href="/keuangan/transaksi?tipe=keluar">+ Pengeluaran</LinkButton>
          </>
        }
      />
      <div className="p-6 md:p-9">
        <PeriodPicker month={month} year={year} currentYear={nowJakarta.year} />

        <div className="mb-6 grid grid-cols-2 border-2 border-ink bg-panel lg:grid-cols-4">
          <div className="border-b border-r border-line p-4.5 lg:border-b-0">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Saldo awal {MONTH_NAMES[month - 1]}
            </div>
            <div className="mt-1.5 whitespace-nowrap font-sans text-[1.3rem] font-extrabold">
              {rupiah(cashBook.saldoAwal)}
            </div>
          </div>
          <div className="border-b border-r-0 border-line p-4.5 lg:border-b-0 lg:border-r">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Uang masuk
            </div>
            <div className="mt-1.5 whitespace-nowrap font-sans text-[1.3rem] font-extrabold">
              + {rupiah(cashBook.totalMasuk)}
            </div>
          </div>
          <div className="border-r border-line p-4.5">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Uang keluar
            </div>
            <div className="mt-1.5 whitespace-nowrap font-sans text-[1.3rem] font-extrabold text-accent">
              − {rupiah(cashBook.totalKeluar)}
            </div>
          </div>
          <div className="bg-ink p-4.5 text-white">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
              Sisa kas hari ini
            </div>
            <div className="mt-1.5 whitespace-nowrap font-sans text-[1.4rem] font-extrabold">
              {rupiah(saldoHariIni)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-2.5">
              <div className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
                Buku kas — {MONTH_NAMES[month - 1]} {year}
              </div>
              <div className="flex gap-2">
                <Link
                  href={tipeLink()}
                  className={`border px-2.5 py-1.5 font-mono text-[0.7rem] ${!tipeFilter ? "border-ink bg-ink text-white" : "border-line text-ink hover:border-accent"}`}
                >
                  Semua
                </Link>
                <Link
                  href={tipeLink("masuk")}
                  className={`border px-2.5 py-1.5 font-mono text-[0.7rem] ${tipeFilter === "masuk" ? "border-ink bg-ink text-white" : "border-line text-ink hover:border-accent"}`}
                >
                  Masuk
                </Link>
                <Link
                  href={tipeLink("keluar")}
                  className={`border px-2.5 py-1.5 font-mono text-[0.7rem] ${tipeFilter === "keluar" ? "border-ink bg-ink text-white" : "border-line text-ink hover:border-accent"}`}
                >
                  Keluar
                </Link>
              </div>
            </div>

            <div className="hidden grid-cols-[58px_1fr_120px_120px_130px] gap-3.5 border-b border-line py-2.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted sm:grid">
              <span>Tgl</span>
              <span>Keterangan</span>
              <span className="text-right">Masuk</span>
              <span className="text-right">Keluar</span>
              <span className="text-right">Sisa kas</span>
            </div>
            {displayedRows.map((r) => (
              <div
                key={r.id}
                className={`border-b border-line py-3 text-[0.82rem] ${r.isOpeningRow ? "bg-[#f7f5ee] font-semibold" : ""}`}
              >
                {/* Mobile card — hidden at sm: and up, where the grid row below takes over. */}
                <div className="sm:hidden">
                  <div className="flex items-baseline justify-between gap-2.5">
                    <span>
                      <span className="font-medium">{r.keterangan}</span>
                      {r.sub && <span className="ml-1 font-mono text-[0.7rem] text-muted">· {r.sub}</span>}
                    </span>
                    <span className="shrink-0 font-mono text-[0.72rem] text-muted">{formatDateShort(r.tanggal)}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[0.75rem]">
                    {r.masuk !== undefined && <span>Masuk {rupiah(r.masuk)}</span>}
                    {r.keluar !== undefined && <span className="text-accent">Keluar {rupiah(r.keluar)}</span>}
                    <span className="font-semibold">Sisa {rupiah(r.saldoBerjalan)}</span>
                  </div>
                </div>
                {/* Desktop/tablet row */}
                <div className="hidden sm:grid sm:grid-cols-[58px_1fr_120px_120px_130px] sm:items-center sm:gap-3.5">
                  <span className="font-mono text-[0.72rem] text-muted">{formatDateShort(r.tanggal)}</span>
                  <span>
                    <span className="font-medium">{r.keterangan}</span>
                    {r.sub && <span className="ml-1 font-mono text-[0.7rem] text-muted">· {r.sub}</span>}
                  </span>
                  <span className="text-right font-mono">{r.masuk ? rupiah(r.masuk) : ""}</span>
                  <span className="text-right font-mono text-accent">{r.keluar ? rupiah(r.keluar) : ""}</span>
                  <span className="text-right font-mono font-semibold">{rupiah(r.saldoBerjalan)}</span>
                </div>
              </div>
            ))}
            {displayedRows.length <= 1 && (
              <div className="border-b border-line py-8 text-center font-mono text-sm text-muted">
                Belum ada transaksi pada periode ini.
              </div>
            )}
            <div className="border-t-2 border-ink py-3.5 font-sans text-[0.85rem] font-extrabold">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5 sm:hidden">
                <span>Total</span>
                <span className="font-mono">Masuk {rupiah(cashBook.totalMasuk)}</span>
                <span className="font-mono text-accent">Keluar {rupiah(cashBook.totalKeluar)}</span>
                <span className="font-mono">Sisa {rupiah(cashBook.saldoAkhir)}</span>
              </div>
              <div className="hidden sm:grid sm:grid-cols-[58px_1fr_120px_120px_130px] sm:gap-3.5">
                <span className="sm:col-span-2">Total</span>
                <span className="text-right">{rupiah(cashBook.totalMasuk)}</span>
                <span className="text-right text-accent">{rupiah(cashBook.totalKeluar)}</span>
                <span className="text-right">{rupiah(cashBook.saldoAkhir)}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="border-b-2 border-ink pb-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
              Rekap kategori {MONTH_NAMES[month - 1]}
            </div>
            {summary.nodes.map((n) => (
              <div key={n.label} className="flex items-center justify-between gap-2.5 border-b border-line py-2.5 font-sans text-[0.82rem]">
                <span>{n.label}</span>
                <b className={n.tipe === "keluar" ? "text-accent" : ""}>
                  {n.tipe === "masuk" ? "+" : "−"} {rupiahCompact(n.value)}
                </b>
              </div>
            ))}
            {summary.nodes.length === 0 && (
              <div className="py-4 text-center font-mono text-[0.75rem] text-muted">Belum ada transaksi.</div>
            )}
            <div className="flex items-center justify-between gap-2.5 py-3 font-sans text-[0.9rem] font-extrabold">
              <span>Bertambah bulan ini</span>
              <span>{summary.netTotal >= 0 ? "+" : "−"} {rupiahCompact(Math.abs(summary.netTotal))}</span>
            </div>

            <div className="mt-6 border-b-2 border-ink pb-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
              Belum jadi kas
            </div>
            <div className="border-b border-line py-3">
              <div className="flex items-baseline justify-between gap-2.5">
                <span className="font-sans text-[0.82rem]">Piutang pelanggan</span>
                <b className="font-sans text-[1rem] text-accent">{rupiahCompact(totalPiutang)}</b>
              </div>
              <div className="mt-1 font-mono text-[0.68rem] text-muted">
                {piutang.length} invoice{piutang.length > 0 ? ` · tertua ${tertuaHari} hari` : ""} ·{" "}
                <Link href="/invoice" className="text-accent no-underline hover:underline">
                  tagih sekarang →
                </Link>
              </div>
            </div>
            <div className="border-b border-line py-3">
              <div className="flex items-baseline justify-between gap-2.5">
                <span className="font-sans text-[0.82rem]">Nilai stok gudang</span>
                <b className="font-sans text-[1rem]">{rupiahCompact(summary.nilaiStok)}</b>
              </div>
              <div className="mt-1 font-mono text-[0.68rem] text-muted">
                {summary.productCount} produk ·{" "}
                <Link href="/produk" className="text-accent no-underline hover:underline">
                  lihat inventory →
                </Link>
              </div>
            </div>
            <div className="mt-3.5 border-l-4 border-accent bg-[#f7f5ee] p-3.5 font-sans text-[0.75rem] leading-relaxed">
              Piutang dan stok <b>belum</b> terhitung di sisa kas — keduanya baru jadi uang setelah pelanggan bayar
              atau barang terjual.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
