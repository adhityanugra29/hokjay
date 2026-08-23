import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import SubnavTabs from "@/components/ui/SubnavTabs";
import GajiSalesSheet from "@/components/payroll/GajiSalesSheet";
import { PAYROLL_TABS } from "@/components/payroll/tabs";
import { getGajiSalesSummary, currentPeriod } from "@/lib/payroll";
import { getSession } from "@/lib/auth/session";

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

export default async function PayrollGajiSalesPage({
  searchParams,
}: PageProps<"/payroll/gaji-sales">) {
  const session = await getSession();
  if (session?.role !== "admin") notFound();

  const sp = await searchParams;
  const periode = typeof sp.periode === "string" ? sp.periode : currentPeriod();
  const rows = await getGajiSalesSummary(periode);

  return (
    <>
      <PageHeader title="Payroll" subtitle="Gaji pokok bulanan untuk sales berstatus Tetap." />
      <div className="p-6 md:p-9">
        <SubnavTabs tabs={PAYROLL_TABS} />
        <GajiSalesSheet rows={rows} periodOptions={periodOptions()} periode={periode} />
      </div>
    </>
  );
}
