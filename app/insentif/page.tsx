import PageHeader from "@/components/layout/PageHeader";
import PeriodPicker from "@/components/ui/PeriodPicker";
import SalesBoard from "@/components/insentif/SalesBoard";
import MobileSalesBoard from "@/components/insentif/MobileSalesBoard";
import { getSalesBoard } from "@/lib/insentif";
import { getSession } from "@/lib/auth/session";
import { currentJakartaMonthYear } from "@/lib/timezone";
import { MONTH_NAMES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function InsentifPage({ searchParams }: PageProps<"/insentif">) {
  const sp = await searchParams;
  const session = await getSession();
  const nowJakarta = currentJakartaMonthYear();
  const month = Number(sp.bulan) || nowJakarta.month;
  const year = Number(sp.tahun) || nowJakarta.year;
  const period = `${year}-${String(month).padStart(2, "0")}`;
  const board = await getSalesBoard(period);
  const periodLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const currentUserNama = session?.role === "sales" ? session.nama : undefined;

  return (
    <>
      {/* Mobile — "7e" */}
      <MobileSalesBoard board={board} periodLabel={periodLabel} currentUserNama={currentUserNama} />

      {/* Desktop — "5a" */}
      <div className="hidden md:block">
        <PageHeader title="Leaderboard Sales" subtitle="CAPAIAN, SISA TARGET, DAN HITUNG MUNDUR — DIPERBARUI OTOMATIS TIAP INVOICE LUNAS" />
        <div className="p-6 md:p-9">
          <PeriodPicker month={month} year={year} currentYear={nowJakarta.year} />
          <div className="mt-5">
            <SalesBoard board={board} periodLabel={periodLabel} />
          </div>
        </div>
      </div>
    </>
  );
}
