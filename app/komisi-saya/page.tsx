import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import KomisiSayaView from "@/components/komisi/KomisiSayaView";
import PeriodStepper from "@/components/komisi/PeriodStepper";
import { getSession } from "@/lib/auth/session";
import { isKomisiSayaAllowed } from "@/lib/auth/access";
import { getMyKomisiOverview } from "@/lib/insentif";
import { currentJakartaMonthYear } from "@/lib/timezone";
import { MONTH_NAMES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * "Komisi Saya" — a Sales rep's own commission ("9b" in the mobile mockup doc
 * the user supplied 2026-08-26). Separate page from /insentif (the
 * multi-sales leaderboard, Owner+Super Admin only) — gated via
 * isKomisiSayaAllowed (lib/auth/access.ts), which is also what the nav uses
 * to decide whether to show this link at all, so the two always agree on who's
 * let in (fixed 2026-08-28: this used to hard-check role === "sales" only, so
 * a "manager" hit a 404 here instead).
 *
 * Redesigned 2026-10-01 (TASK-036, mockup-approved): period filter
 * (?bulan=&tahun=, the same params PeriodPicker uses), headline figure =
 * commission from lunas invoices only, unpaid-invoice commission demoted to a
 * footnote + "Belum lunas" tab, per-invoice status (Lunas / Sudah DP / Belum
 * Bayar) with a link to the real invoice, and a payout history. Per the
 * user's decisions the "Tagih" buttons and the mini Papan Peringkat were
 * removed from this page (the full Leaderboard at /insentif is untouched).
 * "Siap cair" vs "Sudah dibayar" is split by komisiCair — whether the company
 * has transferred the commission, which is Payroll's own domain.
 */
export default async function KomisiSayaPage({ searchParams }: PageProps<"/komisi-saya">) {
  const session = await getSession();
  if (!session || !isKomisiSayaAllowed(session.role)) notFound();

  const sp = await searchParams;
  const current = currentJakartaMonthYear();
  const rawMonth = Number(sp.bulan);
  const rawYear = Number(sp.tahun);
  let month = Number.isInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : current.month;
  let year = Number.isInteger(rawYear) && rawYear >= 2000 && rawYear <= current.year ? rawYear : current.year;
  // Nothing to show past the running month — snap a hand-typed future period back to it.
  if (year * 12 + month > current.year * 12 + current.month) {
    month = current.month;
    year = current.year;
  }

  const period = `${year}-${String(month).padStart(2, "0")}`;
  const periodLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const overview = await getMyKomisiOverview(session.nama, period);

  return (
    <>
      <PageHeader
        title="Komisi Saya"
        subtitle="Komisi dari invoice milikmu yang sudah lunas, per periode."
        actions={<PeriodStepper year={year} month={month} current={current} />}
      />
      <div className="p-4 md:p-9">
        <KomisiSayaView key={period} data={overview} periodLabel={periodLabel} />
      </div>
    </>
  );
}
