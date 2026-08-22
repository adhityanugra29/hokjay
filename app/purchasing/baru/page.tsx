import PageHeader from "@/components/layout/PageHeader";
import OfficeExpenseForm from "@/components/purchasing/OfficeExpenseForm";

export default function PurchasingKebutuhanKantorBaruPage() {
  return (
    <>
      <PageHeader title="Request Kebutuhan Kantor Baru" subtitle="MENUNGGU APPROVAL ADMIN SEBELUM BISA DITRANSFER" />
      <div className="p-6 md:p-9">
        <OfficeExpenseForm />
      </div>
    </>
  );
}
