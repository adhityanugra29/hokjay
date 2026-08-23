import PageHeader from "@/components/layout/PageHeader";
import SubnavTabs from "@/components/ui/SubnavTabs";
import DynamicRequestButton from "@/components/purchasing/DynamicRequestButton";
import { dbConnect } from "@/lib/db";
import { OfficeExpenseRequest } from "@/models/OfficeExpenseRequest";

export const dynamic = "force-dynamic";

export default async function PurchasingLayout({ children }: { children: React.ReactNode }) {
  await dbConnect();
  const pending = await OfficeExpenseRequest.countDocuments({ status: "diajukan" });

  return (
    <>
      <PageHeader
        title="Purchasing"
        subtitle={`${pending} JOB ORDER MENUNGGU APPROVAL`}
        actions={<DynamicRequestButton />}
      />
      <div className="p-6 md:p-9">
        <SubnavTabs
          tabs={[
            { href: "/purchasing", label: "Job Order" },
            { href: "/purchasing/produk-po", label: "Request Produk PO" },
            { href: "/purchasing/tagihan", label: "Material Order" },
            { href: "/purchasing/supplier", label: "Supplier" },
          ]}
        />
        {children}
      </div>
    </>
  );
}
