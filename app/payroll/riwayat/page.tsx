import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import PayrollNav from "@/components/payroll/PayrollNav";
import RiwayatPembayaranClient, { type RiwayatRow } from "@/components/payroll/RiwayatPembayaranClient";
import { currentPayrollPeriode, parsePeriode } from "@/lib/payrollPeriod";
import { getPayrollHistory } from "@/lib/payroll";
import { getSession } from "@/lib/auth/session";
import { isAdminLevel } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

/** Gaji (GajiPayment) + Komisi (grouped from Invoice.komisiCair) payment history, newest first — see lib/payroll.ts's getPayrollHistory. */
export default async function PayrollRiwayatPage({
  searchParams,
}: PageProps<"/payroll/riwayat">) {
  const session = await getSession();
  if (!isAdminLevel(session?.role)) notFound();

  // Shared month stepper (PayrollNav): `?periode=YYYY-MM` filters to that month; no param = all periods.
  const sp = await searchParams;
  const current = currentPayrollPeriode();
  const periode = parsePeriode(typeof sp.periode === "string" ? sp.periode : undefined, current) ?? undefined;

  const history = await getPayrollHistory();
  const rows: RiwayatRow[] = history.map((r) => ({
    key: r.key,
    tipe: r.tipe,
    nama: r.nama,
    periode: r.periode,
    total: r.total,
    tanggalBayar: r.tanggalBayar.toISOString(),
    dibayarOleh: r.dibayarOleh,
    buktiUrl: r.buktiUrl,
    invoices: r.invoices?.map((i) => ({
      invoiceId: i.invoiceId,
      nomor: i.nomor,
      customerNama: i.customerNama,
      tanggalLunas: i.tanggalLunas.toISOString(),
      komisi: i.komisi,
    })),
  }));

  return (
    <>
      <PageHeader title="Payroll" subtitle="Riwayat semua pembayaran gaji dan komisi yang sudah dibayar." />
      <div className="p-6 md:p-9">
        <PayrollNav current={current} />
        <RiwayatPembayaranClient key={periode ?? "semua"} rows={rows} periode={periode} />
      </div>
    </>
  );
}
