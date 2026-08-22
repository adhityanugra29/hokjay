import PageHeader from "@/components/layout/PageHeader";
import DownloadReportButton from "@/components/akuntansi/DownloadReportButton";
import AkuntansiShell from "@/components/akuntansi/AkuntansiShell";

export default function AkuntansiLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader
        title="Akuntansi"
        subtitle="Laporan resmi yang dibentuk otomatis dari invoice, pembayaran, dan catatan kas. Isinya tidak bisa diubah manual di sini."
        actions={<DownloadReportButton />}
      />
      <AkuntansiShell>{children}</AkuntansiShell>
    </>
  );
}
