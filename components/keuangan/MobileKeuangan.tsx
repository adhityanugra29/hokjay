import Link from "next/link";
import PeriodPicker from "@/components/ui/PeriodPicker";
import { rupiah, rupiahCompact, formatDateShort } from "@/lib/format";
import type { CashBook } from "@/lib/keuangan";
import { MONTH_NAMES } from "@/lib/constants";

/**
 * "7h" — mobile-only Keuangan: dark header with the true current cash
 * balance, a 2-col masuk/keluar strip, the 3 most recent buku-kas entries,
 * expense categories folded into ranked bars, and a sticky bottom pair of
 * "Catat pengeluaran/pemasukan" actions. Desktop keeps the full buku-kas
 * table (app/keuangan/page.tsx, "2a") under hidden md:block — this reuses
 * the exact same already-fetched data, just a different shape.
 */
export default function MobileKeuangan({
  month,
  year,
  currentYear,
  saldoHariIni,
  cashBook,
  keluarNodes,
  netTotal,
}: {
  month: number;
  year: number;
  currentYear: number;
  saldoHariIni: number;
  cashBook: CashBook;
  keluarNodes: { label: string; value: number }[];
  netTotal: number;
}) {
  const recentRows = cashBook.rows
    .filter((r) => !r.isOpeningRow)
    .slice(-3)
    .reverse();
  const top3 = [...keluarNodes].sort((a, b) => b.value - a.value).slice(0, 3);
  const topValue = top3[0]?.value ?? 1;

  const isCurrentMonth = month === new Date().getMonth() + 1 && year === new Date().getFullYear();

  return (
    <div className="flex min-h-[calc(100vh-58px)] flex-col bg-panel md:hidden">
      <div className="bg-ink px-4 pb-4 pt-3 text-panel">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-sans text-[1.05rem] font-extrabold tracking-tight text-white">Keuangan</div>
            <div className="mt-1 font-sans text-[0.68rem] text-white/50">
              {MONTH_NAMES[month - 1]} {year}
              {isCurrentMonth ? ` · sampai ${formatDateShort(new Date())}` : ""}
            </div>
          </div>
        </div>
        <div className="mt-3.5 border-t border-white/20 pt-3">
          <div className="font-sans text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/50">
            Saldo kas & bank
          </div>
          <div className="mt-1.5 font-sans text-[1.5rem] font-extrabold tracking-tight text-white">
            {rupiah(saldoHariIni)}
          </div>
        </div>
      </div>

      <div className="border-b border-line bg-white px-4 py-3">
        <PeriodPicker month={month} year={year} currentYear={currentYear} />
      </div>

      <div className="grid grid-cols-2 border-b-2 border-ink bg-white">
        <div className="border-r border-line px-4 py-3.5">
          <div className="font-sans text-[9.5px] font-bold uppercase tracking-[0.13em] text-muted">Masuk bulan ini</div>
          <div className="mt-1 font-sans text-[1.05rem] font-extrabold tracking-tight">{rupiahCompact(cashBook.totalMasuk)}</div>
        </div>
        <div className="px-4 py-3.5">
          <div className="font-sans text-[9.5px] font-bold uppercase tracking-[0.13em] text-muted">Keluar bulan ini</div>
          <div className="mt-1 font-sans text-[1.05rem] font-extrabold tracking-tight text-accent-700">{rupiahCompact(cashBook.totalKeluar)}</div>
        </div>
      </div>

      <div className="flex-1">
        <div className="flex items-baseline justify-between px-4 pb-2 pt-4">
          <span className="font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">Catatan terbaru</span>
          <span className="font-sans text-[11px] text-muted">{cashBook.rows.length - 1} transaksi bulan ini</span>
        </div>
        <div className="border-t border-line bg-white">
          {recentRows.map((r) => (
            <div key={r.id} className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-3">
              <span className="min-w-0">
                <b className="block font-sans text-[0.85rem]">{r.keterangan}</b>
                <span className="mt-0.5 block font-sans text-[0.72rem] text-muted">
                  {formatDateShort(r.tanggal)}
                  {r.sub ? ` · ${r.sub}` : ""}
                </span>
              </span>
              <b className={`whitespace-nowrap font-sans text-[0.82rem] tracking-tight ${r.keluar ? "text-accent-700" : ""}`}>
                {r.masuk ? `+ ${rupiahCompact(r.masuk)}` : `− ${rupiahCompact(r.keluar ?? 0)}`}
              </b>
            </div>
          ))}
          {recentRows.length === 0 && (
            <div className="py-8 text-center font-sans text-[0.82rem] text-muted">Belum ada transaksi bulan ini.</div>
          )}
        </div>

        {top3.length > 0 && (
          <>
            <div className="px-4 pb-2 pt-4 font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
              Pengeluaran · {top3.length} terbesar
            </div>
            <div className="border-t border-line bg-white">
              {top3.map((n) => (
                <div key={n.label} className="grid grid-cols-[1fr_auto] items-center gap-2.5 border-b border-line px-4 py-3">
                  <span className="min-w-0 font-sans text-[0.8rem] font-bold">{n.label}</span>
                  <b className="whitespace-nowrap font-sans text-[0.78rem] tracking-tight">{rupiahCompact(n.value)}</b>
                  <div className="relative col-span-2 mt-0.5 h-2 bg-ink/10">
                    <div className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${Math.min(100, Math.round((n.value / topValue) * 100))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="sticky bottom-[58px] border-t-2 border-ink bg-white px-4 py-3.5">
        <div className="flex items-baseline justify-between">
          <span className="font-sans text-[0.75rem] text-muted">Sisa bulan ini</span>
          <b className="font-sans text-[1rem] tracking-tight">
            {netTotal >= 0 ? "+" : "−"} {rupiah(Math.abs(netTotal))}
          </b>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <Link
            href="/keuangan/transaksi?tipe=keluar"
            className="flex min-h-[44px] items-center justify-center bg-accent px-3 py-3.5 text-center font-sans text-[0.82rem] font-extrabold text-ink no-underline"
          >
            Catat pengeluaran
          </Link>
          <Link
            href="/keuangan/transaksi?tipe=masuk"
            className="flex min-h-[44px] items-center justify-center border border-line px-3 py-3.5 text-center font-sans text-[0.82rem] font-bold text-ink no-underline"
          >
            Catat pemasukan
          </Link>
        </div>
      </div>
    </div>
  );
}
