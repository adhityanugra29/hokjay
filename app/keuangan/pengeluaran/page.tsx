import PageHeader from "@/components/layout/PageHeader";
import ExpenseForm from "@/components/keuangan/ExpenseForm";

export default function PengeluaranPage() {
  return (
    <>
      <PageHeader title="Catat Pengeluaran" subtitle="TERCATAT SEBAGAI UANG KELUAR" />
      <div className="p-6 md:p-9">
        <ExpenseForm />
      </div>
    </>
  );
}
