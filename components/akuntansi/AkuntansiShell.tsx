"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import PeriodPicker from "@/components/ui/PeriodPicker";
import { currentJakartaMonthYear } from "@/lib/timezone";

const REPORTS = [
  { href: "/akuntansi/neraca-saldo", label: "Neraca Saldo", desc: "Saldo tiap akun" },
  { href: "/akuntansi/laba-rugi", label: "Laba Rugi", desc: "Untung atau rugi bulan ini" },
  { href: "/akuntansi/neraca", label: "Neraca", desc: "Harta, utang, modal" },
];

/**
 * Document-style Akuntansi shell ("1e" in the 2026-08-22 redesign) — left
 * sidebar (report picker + period filter, both need live route/query state
 * so this is a client component, same pattern as SubnavTabs/PeriodPicker),
 * right side wraps each report page's own content in a "paper" card.
 * `layout.tsx` can't read searchParams server-side (only page.tsx can), so
 * the period picker's current month/year is derived here via
 * useSearchParams() instead, with today's Jakarta month/year as the
 * fallback — matching what each report page itself defaults to.
 */
export default function AkuntansiShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nowJakarta = currentJakartaMonthYear();
  const month = Number(searchParams.get("bulan")) || nowJakarta.month;
  const year = Number(searchParams.get("tahun")) || nowJakarta.year;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[252px_1fr]">
      <aside className="border-b-2 border-line bg-panel py-6 lg:border-b-0 lg:border-r-2 lg:border-ink">
        <div className="px-6 pb-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          Laporan
        </div>
        {REPORTS.map((r) => {
          const active = pathname === r.href;
          return (
            <Link
              key={r.href}
              href={`${r.href}?bulan=${month}&tahun=${year}`}
              className={`block border-t border-line px-6 py-3 text-[0.85rem] no-underline last:border-b ${
                active ? "bg-ink font-bold text-white" : "text-ink hover:bg-[#f7f5ee]"
              }`}
            >
              {r.label}
              <div className={`mt-0.5 font-mono text-[0.68rem] font-normal ${active ? "text-white/60" : "text-muted"}`}>
                {r.desc}
              </div>
            </Link>
          );
        })}
        <div className="px-6 pt-6 pb-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          Periode
        </div>
        <div className="px-6">
          <PeriodPicker month={month} year={year} currentYear={nowJakarta.year} />
        </div>
        <div className="mt-2 border-t border-line px-6 pt-3.5 font-mono text-[0.68rem] leading-relaxed text-muted">
          Jurnal umum &amp; buku besar tidak ditampilkan sebagai halaman — keduanya ikut terbawa di unduhan PDF.
        </div>
      </aside>
      <div className="p-6 md:p-9">{children}</div>
    </div>
  );
}
