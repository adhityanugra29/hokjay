import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import PayrollNav from "@/components/payroll/PayrollNav";
import AbsensiForm from "@/components/payroll/AbsensiForm";
import { currentPayrollPeriode, daysInPeriode, parsePeriode } from "@/lib/payrollPeriod";
import { getSession } from "@/lib/auth/session";
import { isAdminLevel } from "@/lib/auth/access";
import { dbConnect } from "@/lib/db";
import { Karyawan } from "@/models/Karyawan";
import { Absensi } from "@/models/Absensi";

export const dynamic = "force-dynamic";

/** Today's day-of-month in GMT+7 (the running month's last selectable day). */
function todayDayJakarta(): number {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).getUTCDate();
}

/**
 * Absensi harian. The month comes from PayrollNav's shared `?periode=`
 * stepper (default: the running month); the day from `?tanggal=YYYY-MM-DD`
 * inside that month. Default day: today for the running month, the month's
 * last day for an earlier one. Days after today are not selectable.
 */
export default async function PayrollAbsensiPage({
  searchParams,
}: PageProps<"/payroll/absensi">) {
  const session = await getSession();
  if (!isAdminLevel(session?.role)) notFound();

  const sp = await searchParams;
  const current = currentPayrollPeriode();
  const periode = parsePeriode(typeof sp.periode === "string" ? sp.periode : undefined, current) ?? current;
  const maxDay = periode === current ? todayDayJakarta() : daysInPeriode(periode);

  const rawTanggal = typeof sp.tanggal === "string" ? sp.tanggal : "";
  const tanggalMatch = /^(\d{4}-\d{2})-(\d{2})$/.exec(rawTanggal);
  const dayFromUrl = tanggalMatch && tanggalMatch[1] === periode ? Number(tanggalMatch[2]) : null;
  const day = dayFromUrl && dayFromUrl >= 1 && dayFromUrl <= maxDay ? dayFromUrl : maxDay;
  const tanggal = `${periode}-${String(day).padStart(2, "0")}`;

  await dbConnect();
  const dayDate = new Date(tanggal);
  const start = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const [karyawanList, hadirRows] = await Promise.all([
    Karyawan.find({ aktif: true }).sort({ nama: 1 }).lean(),
    Absensi.find({ tanggal: { $gte: start, $lt: end } }).lean(),
  ]);

  return (
    <>
      <PageHeader title="Payroll" subtitle="Tandai karyawan non-sales yang hadir hari ini — jadi dasar perhitungan gaji." />
      <div className="p-6 md:p-9">
        <PayrollNav current={current} />
        <AbsensiForm
          key={tanggal}
          tanggal={tanggal}
          periode={periode}
          maxDay={maxDay}
          karyawanList={karyawanList.map((k) => ({ _id: String(k._id), nama: k.nama, jabatan: k.jabatan ?? undefined }))}
          hadirRows={hadirRows.map((r) => ({ _id: String(r._id), karyawan: String(r.karyawan) }))}
        />
      </div>
    </>
  );
}
