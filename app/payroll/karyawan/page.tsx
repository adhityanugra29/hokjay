import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import SubnavTabs from "@/components/ui/SubnavTabs";
import KaryawanManager from "@/components/payroll/KaryawanManager";
import { PAYROLL_TABS } from "@/components/payroll/tabs";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function PayrollKaryawanPage() {
  const session = await getSession();
  if (session?.role !== "admin") notFound();

  return (
    <>
      <PageHeader title="Payroll" subtitle="Roster karyawan non-sales (kurir, admin gudang, dll) — tidak punya login sendiri." />
      <div className="p-6 md:p-9">
        <SubnavTabs tabs={PAYROLL_TABS} />
        <KaryawanManager />
      </div>
    </>
  );
}
