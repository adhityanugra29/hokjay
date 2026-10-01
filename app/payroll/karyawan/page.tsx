import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import PayrollNav from "@/components/payroll/PayrollNav";
import { currentPayrollPeriode } from "@/lib/payrollPeriod";
import KaryawanManager from "@/components/payroll/KaryawanManager";
import { getSession } from "@/lib/auth/session";
import { isAdminLevel } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export default async function PayrollKaryawanPage() {
  const session = await getSession();
  if (!isAdminLevel(session?.role)) notFound();

  return (
    <>
      <PageHeader title="Payroll" subtitle="Roster karyawan non-sales (kurir, admin gudang, dll) — tidak punya login sendiri." />
      <div className="p-6 md:p-9">
        <PayrollNav current={currentPayrollPeriode()} />
        <KaryawanManager />
      </div>
    </>
  );
}
