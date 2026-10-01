import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import PayrollNav from "@/components/payroll/PayrollNav";
import GajiBulananSheet from "@/components/payroll/GajiBulananSheet";
import { getGajiBulananSummary } from "@/lib/payroll";
import { currentPayrollPeriode, parsePeriode } from "@/lib/payrollPeriod";
import { getCurrentCashBalance } from "@/lib/keuangan";
import { getSession } from "@/lib/auth/session";
import { isAdminLevel } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

/**
 * Gaji Sales Tetap + Gaji Karyawan, merged into one tab — see lib/payroll.ts's getGajiBulananSummary.
 * One responsive tree for every screen size (the separate MobileGajiBulanan
 * is no longer used here); the month comes from PayrollNav's shared
 * `?periode=` stepper, defaulting to the running month.
 */
export default async function PayrollGajiPage({
  searchParams,
}: PageProps<"/payroll/gaji">) {
  const session = await getSession();
  if (!isAdminLevel(session?.role)) notFound();

  const sp = await searchParams;
  const current = currentPayrollPeriode();
  const periode = parsePeriode(typeof sp.periode === "string" ? sp.periode : undefined, current) ?? current;
  const [rows, kasSekarang] = await Promise.all([getGajiBulananSummary(periode), getCurrentCashBalance()]);

  return (
    <>
      <PageHeader title="Payroll" subtitle="Gaji pokok sales tetap dan gaji karyawan non-sales, dibayar dari satu tempat." />
      <div className="p-6 md:p-9">
        <PayrollNav current={current} />
        <GajiBulananSheet key={periode} rows={rows} periode={periode} kasSekarang={kasSekarang} />
      </div>
    </>
  );
}
