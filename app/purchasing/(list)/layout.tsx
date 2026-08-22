import PageHeader from "@/components/layout/PageHeader";
import SubnavTabs from "@/components/ui/SubnavTabs";
import { LinkButton } from "@/components/ui/Button";
import { dbConnect } from "@/lib/db";
import { PurchaseRequest } from "@/models/PurchaseRequest";

export const dynamic = "force-dynamic";

export default async function PurchasingLayout({ children }: { children: React.ReactNode }) {
  await dbConnect();
  const pending = await PurchaseRequest.countDocuments({ status: { $in: ["diajukan", "diproses"] } });

  return (
    <>
      <PageHeader
        title="Purchasing"
        subtitle={`${pending} REQUEST MENUNGGU DIPROSES`}
        actions={<LinkButton href="/purchasing/baru">+ Request Baru</LinkButton>}
      />
      <div className="p-6 md:p-9">
        <SubnavTabs
          tabs={[
            { href: "/purchasing", label: "Request Pembelian" },
            { href: "/purchasing/tagihan", label: "Tagihan Pembelian" },
            { href: "/purchasing/supplier", label: "Supplier" },
          ]}
        />
        {children}
      </div>
    </>
  );
}
