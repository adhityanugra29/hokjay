import PageHeader from "@/components/layout/PageHeader";
import SubnavTabs from "@/components/ui/SubnavTabs";
import DynamicRequestButton from "@/components/purchasing/DynamicRequestButton";
import { dbConnect } from "@/lib/db";
import { OfficeExpenseRequest } from "@/models/OfficeExpenseRequest";
import { getPurchasingSummary } from "@/lib/purchasing";

export const dynamic = "force-dynamic";

/**
 * "Purchasing" now defaults to the PO/restocking dashboard (design "6a",
 * confirmed with the user 2026-08-24) instead of Job Order — Job Order
 * (office expenses) moved to its own tab, same as the other three.
 */
export default async function PurchasingLayout({ children }: { children: React.ReactNode }) {
  await dbConnect();
  const [pendingJobOrder, summary] = await Promise.all([
    OfficeExpenseRequest.countDocuments({ status: "diajukan" }),
    getPurchasingSummary(),
  ]);

  return (
    <>
      <PageHeader
        title="Purchasing"
        subtitle={`${summary.poJalanCount} PO BERJALAN · ${summary.perluDibeliCount} BARANG PERLU DIBELI · ${pendingJobOrder} JOB ORDER MENUNGGU APPROVAL`}
        actions={<DynamicRequestButton />}
      />
      <div className="p-6 md:p-9">
        <SubnavTabs
          tabs={[
            { href: "/purchasing", label: "Purchasing" },
            { href: "/purchasing/job-order", label: "Job Order" },
            { href: "/purchasing/tagihan", label: "Material Order" },
            { href: "/purchasing/supplier", label: "Supplier" },
          ]}
        />
        {children}
      </div>
    </>
  );
}
