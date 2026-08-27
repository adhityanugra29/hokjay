import PageHeader from "@/components/layout/PageHeader";
import SubnavTabs from "@/components/ui/SubnavTabs";
import { getSession } from "@/lib/auth/session";
import { isAllowedPage } from "@/lib/auth/access";

const ADMIN_TABS = [
  { href: "/admin", label: "Kategori" },
  { href: "/admin/user", label: "Sales" },
  { href: "/admin/akun", label: "Akun Login" },
  { href: "/admin/kurir", label: "Kurir" },
  { href: "/admin/pembayaran", label: "Metode Pembayaran" },
  { href: "/admin/keuangan", label: "Keuangan" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Filtered per role (2026-08-27) — Manager Hojay can reach most of Admin
  // now (Kategori/Akun Login/Kurir/Metode Pembayaran) but not Sales or
  // Keuangan (see MANAGER_BLOCKED_ADMIN_PREFIXES); rendering every tab
  // regardless of role meant Manager saw two tabs that just bounced them
  // back to Beranda on click, the exact same confusing "tombol tidak bisa
  // diklik" pattern already reported once for the mobile Menu tab. Full
  // Admin roles still see everything, unaffected.
  const session = await getSession();
  const tabs = session ? ADMIN_TABS.filter((t) => isAllowedPage(session.role, t.href)) : ADMIN_TABS;

  return (
    <>
      <PageHeader title="Admin" subtitle="KELOLA KATEGORI, USER, KURIR, PEMBAYARAN & KEUANGAN" />
      <div className="p-6 md:p-9">
        <SubnavTabs tabs={tabs} />
        {children}
      </div>
    </>
  );
}
