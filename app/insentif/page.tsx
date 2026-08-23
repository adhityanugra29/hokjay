import PageHeader from "@/components/layout/PageHeader";
import SubnavTabs from "@/components/ui/SubnavTabs";
import PeriodPicker from "@/components/ui/PeriodPicker";
import SalesBoard from "@/components/insentif/SalesBoard";
import { getSalesBoard } from "@/lib/insentif";
import { currentJakartaMonthYear } from "@/lib/timezone";
import { MONTH_NAMES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function InsentifPage({ searchParams }: PageProps<"/insentif">) {
  const sp = await searchParams;
  const nowJakarta = currentJakartaMonthYear();
  const month = Number(sp.bulan) || nowJakarta.month;
  const year = Number(sp.tahun) || nowJakarta.year;
  const period = `${year}-${String(month).padStart(2, "0")}`;
  const board = await getSalesBoard(period);
  const periodLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  return (
    <>
      <PageHeader title="Leaderboard Sales" subtitle="CAPAIAN, SISA TARGET, DAN HITUNG MUNDUR — DIPERBARUI OTOMATIS TIAP INVOICE LUNAS" />
      <div className="p-6 md:p-9">
        <PeriodPicker month={month} year={year} currentYear={nowJakarta.year} />

        <SubnavTabs
          tabs={[
            { href: "/insentif", label: "Rekap per Personil" },
            { href: "/insentif/item", label: "Rincian per Item" },
            { href: "/insentif/riwayat", label: "Riwayat per Invoice" },
          ]}
        />

        <SalesBoard board={board} periodLabel={periodLabel} />
      </div>
    </>
  );
}
