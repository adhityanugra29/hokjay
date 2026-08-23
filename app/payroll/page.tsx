import { notFound } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import SubnavTabs from "@/components/ui/SubnavTabs";
import BayarKomisiSheet from "@/components/insentif/BayarKomisiSheet";
import SlipGajiView from "@/components/payroll/SlipGajiView";
import { PAYROLL_TABS } from "@/components/payroll/tabs";
import { getUnpaidCommissionBySales, getUnpaidCommissionInvoices } from "@/lib/insentif";
import { getCurrentCashBalance } from "@/lib/keuangan";
import { getSlipGaji } from "@/lib/payroll";
import { getSession } from "@/lib/auth/session";
import { dbConnect } from "@/lib/db";
import { Sales } from "@/models/Sales";

export const dynamic = "force-dynamic";

/**
 * "Payroll" — merges the old standalone Bayar Komisi into one nav entry
 * with gaji pokok (sales tetap) + gaji karyawan (non-sales, absensi-based),
 * per the user's request 2026-08-23. One shared URL, two very different
 * views depending on who's looking: Admin gets the full payment dashboard
 * (this page = its Komisi tab); Sales gets a read-only slip of their own
 * gaji pokok + komisi. Everyone else is blocked by lib/auth/access.ts
 * before reaching here — the role check below is a defensive backstop.
 */
export default async function PayrollPage() {
  const session = await getSession();
  if (!session) notFound();

  if (session.role === "sales") {
    const slip = await getSlipGaji(session.nama);
    return (
      <>
        <PageHeader title="Payroll — Slip Gaji Saya" subtitle="GAJI POKOK (JIKA TETAP) & KOMISI YANG SUDAH CAIR" />
        <div className="p-6 md:p-9">
          <SlipGajiView slip={slip} salesNama={session.nama} />
        </div>
      </>
    );
  }

  if (session.role !== "admin") notFound();

  await dbConnect();
  const rows = await getUnpaidCommissionBySales();

  const [invoicesBySales, salesDocs, saldoHariIni] = await Promise.all([
    Promise.all(rows.map((r) => getUnpaidCommissionInvoices(r.salesNama))),
    Sales.find({ nama: { $in: rows.map((r) => r.salesNama) } }).lean(),
    getCurrentCashBalance(),
  ]);

  const bankByNama = new Map(salesDocs.map((s) => [s.nama, s]));

  const sheetRows = rows.map((r, i) => {
    const bank = bankByNama.get(r.salesNama);
    return {
      salesNama: r.salesNama,
      invoiceIds: invoicesBySales[i].map((inv) => inv.invoiceId),
      totalKomisi: r.totalKomisi,
      invoiceCount: r.invoiceCount,
      bank: bank?.bank ?? undefined,
      nomorRekening: bank?.nomorRekening ?? undefined,
      rekeningTerverifikasi: bank?.rekeningTerverifikasi ?? false,
    };
  });

  return (
    <>
      <PageHeader
        title="Payroll"
        subtitle="Bayar komisi sales, gaji pokok sales tetap, dan gaji karyawan non-sales — semuanya di satu tempat."
      />
      <div className="p-6 md:p-9">
        <SubnavTabs tabs={PAYROLL_TABS} />
        <BayarKomisiSheet rows={sheetRows} saldoHariIni={saldoHariIni} />
        <div className="mt-3 font-mono text-[0.72rem] text-muted">
          Butuh lihat siapa yang sudah dibayar dan buktinya?{" "}
          <Link href="/insentif/riwayat" className="text-accent underline underline-offset-2">
            Cek Riwayat per Invoice
          </Link>
          .
        </div>
      </div>
    </>
  );
}
