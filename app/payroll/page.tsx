import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import SubnavTabs from "@/components/ui/SubnavTabs";
import BayarKomisiSheet from "@/components/insentif/BayarKomisiSheet";
import SlipGajiView from "@/components/payroll/SlipGajiView";
import { PAYROLL_TABS } from "@/components/payroll/tabs";
import { getUnpaidCommissionBySales, getUnpaidCommissionInvoices } from "@/lib/insentif";
import { getCurrentCashBalance } from "@/lib/keuangan";
import { getSlipGaji } from "@/lib/payroll";
import { getSession } from "@/lib/auth/session";
import { isAdminLevel } from "@/lib/auth/access";
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

  if (!isAdminLevel(session.role)) notFound();

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
      // Full invoice-level breakdown (nomor, tanggal lunas, item, komisi per
      // invoice) — already fetched above for invoiceIds, just kept instead
      // of thrown away. Powers the Detail pop-up on each row so the amount
      // shown has a checkable basis, not just a number. Per the user's
      // request 2026-09-04 ("ada basis data yang bisa dipercaya atas komisi
      // yang kamu hitung").
      detail: invoicesBySales[i],
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
      </div>
    </>
  );
}
