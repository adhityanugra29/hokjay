import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import SubnavTabs from "@/components/ui/SubnavTabs";
import GajiBulananSheet from "@/components/payroll/GajiBulananSheet";
import MobileGajiBulanan from "@/components/payroll/MobileGajiBulanan";
import { PAYROLL_TABS } from "@/components/payroll/tabs";
import { getGajiBulananSummary, currentPeriod } from "@/lib/payroll";
import { getCurrentCashBalance } from "@/lib/keuangan";
import { getSession } from "@/lib/auth/session";
import { isAdminLevel } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

function periodOptions(): string[] {
  const now = new Date();
  const opts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return opts;
}

/** Gaji Sales Tetap + Gaji Karyawan, merged into one tab — see lib/payroll.ts's getGajiBulananSummary. */
export default async function PayrollGajiPage({
  searchParams,
}: PageProps<"/payroll/gaji">) {
  const session = await getSession();
  if (!isAdminLevel(session?.role)) notFound();

  const sp = await searchParams;
  const periode = typeof sp.periode === "string" ? sp.periode : currentPeriod();
  const [rows, kasSekarang] = await Promise.all([getGajiBulananSummary(periode), getCurrentCashBalance()]);

  return (
    <>
      {/* Mobile — "7j" */}
      <MobileGajiBulanan rows={rows} periodOptions={periodOptions()} periode={periode} kasSekarang={kasSekarang} />

      {/* Desktop */}
      <div className="hidden md:block">
        <PageHeader title="Payroll" subtitle="Gaji pokok sales tetap dan gaji karyawan non-sales, dibayar dari satu tempat." />
        <div className="p-6 md:p-9">
          <SubnavTabs tabs={PAYROLL_TABS} />
          <GajiBulananSheet rows={rows} periodOptions={periodOptions()} periode={periode} />
        </div>
      </div>
    </>
  );
}
