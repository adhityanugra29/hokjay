import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import BayarKomisiSheet from "@/components/insentif/BayarKomisiSheet";
import { getUnpaidCommissionBySales, getUnpaidCommissionInvoices } from "@/lib/insentif";
import { getCurrentCashBalance } from "@/lib/keuangan";
import { dbConnect } from "@/lib/db";
import { Sales } from "@/models/Sales";

export const dynamic = "force-dynamic";

/**
 * "Lembar sekali pakai" per the 2026-08-22 redesign ("3e") — centang sales,
 * lihat total, bayar sekaligus, dengan konsekuensi ditulis sebelum tombol.
 * Confirmed with the user to keep the *existing* pay-anytime behavior
 * (commission becomes payable the moment an invoice is marked lunas) rather
 * than the mockup's period-lock ("Tutup Periode") workflow — this is a
 * visual redesign only, not a new closing-cycle feature.
 */
export default async function BayarKomisiPage() {
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
        title="Bayar Komisi"
        subtitle="Centang siapa yang dibayar, lihat totalnya, bayar sekaligus. Setelah dibayar langsung tercatat sebagai uang keluar di Keuangan."
      />
      <div className="p-6 md:p-9">
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
