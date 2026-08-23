import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import SubnavTabs from "@/components/ui/SubnavTabs";
import AbsensiForm from "@/components/payroll/AbsensiForm";
import { PAYROLL_TABS } from "@/components/payroll/tabs";
import { getSession } from "@/lib/auth/session";
import { dbConnect } from "@/lib/db";
import { Karyawan } from "@/models/Karyawan";
import { Absensi } from "@/models/Absensi";

export const dynamic = "force-dynamic";

export default async function PayrollAbsensiPage({
  searchParams,
}: PageProps<"/payroll/absensi">) {
  const session = await getSession();
  if (session?.role !== "admin") notFound();

  const sp = await searchParams;
  const tanggal = typeof sp.tanggal === "string" ? sp.tanggal : new Date().toISOString().slice(0, 10);

  await dbConnect();
  const day = new Date(tanggal);
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const [karyawanList, hadirRows] = await Promise.all([
    Karyawan.find({ aktif: true }).sort({ nama: 1 }).lean(),
    Absensi.find({ tanggal: { $gte: start, $lt: end } }).lean(),
  ]);

  return (
    <>
      <PageHeader title="Payroll" subtitle="Tandai karyawan non-sales yang hadir hari ini — jadi dasar perhitungan gaji." />
      <div className="p-6 md:p-9">
        <SubnavTabs tabs={PAYROLL_TABS} />
        <AbsensiForm
          tanggal={tanggal}
          karyawanList={karyawanList.map((k) => ({ _id: String(k._id), nama: k.nama, jabatan: k.jabatan ?? undefined }))}
          hadirRows={hadirRows.map((r) => ({ _id: String(r._id), karyawan: String(r.karyawan) }))}
        />
      </div>
    </>
  );
}
