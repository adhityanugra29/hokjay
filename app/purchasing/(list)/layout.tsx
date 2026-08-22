import PageHeader from "@/components/layout/PageHeader";
import SubnavTabs from "@/components/ui/SubnavTabs";
import { LinkButton } from "@/components/ui/Button";
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
        subtitle={`${pending} REQUEST KEBUTUHAN KANTOR MENUNGGU APPROVAL`}
        actions={<LinkButton href="/purchasing/baru">+ Request Baru</LinkButton>}
      />
      <div className="p-6 md:p-9">
        <SubnavTabs
          tabs={[
            { href: "/purchasing", label: "Kebutuhan Kantor" },
            { href: "/purchasing/produk-po", label: "Request Produk PO" },
            { href: "/purchasing/tagihan", label: "Tagihan Pembelian" },
            { href: "/purchasing/inventaris", label: "Inventaris Kantor" },
            { href: "/purchasing/supplier", label: "Supplier" },
          ]}
        />
        {children}
      </div>
    </>
  );
}
