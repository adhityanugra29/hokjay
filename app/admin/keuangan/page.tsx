import PengaturanKeuangan from "@/components/admin/PengaturanKeuangan";
import PengaturanSyaratKetentuan from "@/components/admin/PengaturanSyaratKetentuan";

export default function AdminKeuanganPage() {
  return (
    <div className="flex flex-col gap-6">
      <PengaturanKeuangan />
      <PengaturanSyaratKetentuan />
    </div>
  );
}
