import PageHeader from "@/components/layout/PageHeader";
import SubnavTabs from "@/components/ui/SubnavTabs";
import DownloadReportButton from "@/components/akuntansi/DownloadReportButton";

export default function AkuntansiLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader
        title="Akuntansi"
        subtitle="JURNAL OTOMATIS DARI INVOICE, PEMBAYARAN & KAS"
        actions={<DownloadReportButton />}
      />
      <div className="p-6 md:p-9">
        <SubnavTabs
          tabs={[
            { href: "/akuntansi/neraca-saldo", label: "Neraca Saldo" },
            { href: "/akuntansi/laba-rugi", label: "Laba Rugi" },
            { href: "/akuntansi/neraca", label: "Neraca" },
          ]}
        />
        {children}
      </div>
    </>
  );
}
