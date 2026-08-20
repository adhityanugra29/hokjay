import PageHeader from "@/components/layout/PageHeader";
import TransactionForm from "@/components/keuangan/TransactionForm";

export default async function TransaksiPage({ searchParams }: PageProps<"/keuangan/transaksi">) {
  const sp = await searchParams;
  const tipe = sp.tipe === "masuk" ? "masuk" : "keluar";

  return (
    <>
      <PageHeader
        title={tipe === "masuk" ? "Catat Pemasukan" : "Catat Pengeluaran"}
        subtitle={tipe === "masuk" ? "TERCATAT SEBAGAI UANG MASUK" : "TERCATAT SEBAGAI UANG KELUAR"}
      />
      <div className="p-6 md:p-9">
        <TransactionForm defaultTipe={tipe} />
      </div>
    </>
  );
}
