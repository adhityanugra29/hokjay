import PageHeader from "@/components/layout/PageHeader";
import SubnavTabs from "@/components/ui/SubnavTabs";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="Admin" subtitle="KELOLA KATEGORI, USER, KURIR, ZONA ONGKIR & METODE PEMBAYARAN" />
      <div className="p-6 md:p-9">
        <SubnavTabs
          tabs={[
            { href: "/admin", label: "Kategori" },
            { href: "/admin/user", label: "User" },
            { href: "/admin/kurir", label: "Kurir" },
            { href: "/admin/zona-ongkir", label: "Zona Ongkir" },
            { href: "/admin/pembayaran", label: "Metode Pembayaran" },
          ]}
        />
        {children}
      </div>
    </>
  );
}
