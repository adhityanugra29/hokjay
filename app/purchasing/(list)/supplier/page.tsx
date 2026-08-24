import SupplierManager from "@/components/purchasing/SupplierManager";
import MobileSupplier from "@/components/purchasing/MobileSupplier";
import { getSuppliersWithUtang } from "@/lib/purchasing";

export const dynamic = "force-dynamic";

export default async function PurchasingSupplierPage() {
  const suppliers = await getSuppliersWithUtang();
  const totalUtang = suppliers.reduce((s, r) => s + r.utangBerjalan, 0);

  return (
    <>
      {/* Mobile — "7l" */}
      <MobileSupplier suppliers={suppliers} totalUtang={totalUtang} />

      {/* Desktop */}
      <div className="hidden md:block">
        <SupplierManager />
      </div>
    </>
  );
}
