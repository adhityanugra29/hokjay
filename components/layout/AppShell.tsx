"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "@/lib/nav";
import { isAllowedPage } from "@/lib/auth/access";
import NavIcon from "./NavIcons";
import Logo from "./Logo";
import MobileTabBar from "./MobileTabBar";
import LogoutButton from "./LogoutButton";
import type { UserRole } from "@/models/User";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

const ROLE_LABEL: Record<UserRole, string> = {
  sales: "Sales",
  finance: "Finance",
  purchasing: "Purchasing",
  admin: "Admin",
  owner: "Owner Hojay",
};

export interface NavBadgeCounts {
  invoiceCount: number;
  produkBaru: number;
}

export default function AppShell({
  children,
  user,
  badgeCounts,
}: {
  children: React.ReactNode;
  user: { nama: string; role: UserRole } | null;
  badgeCounts?: NavBadgeCounts;
}) {
  const pathname = usePathname();

  // /login renders its own centered layout — no sidebar chrome around it.
  if (pathname === "/login" || !user) {
    return <>{children}</>;
  }

  const counts = badgeCounts ?? { invoiceCount: 0, produkBaru: 0 };
  const visibleGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => isAllowedPage(user.role, item.href)),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      {/* Sidebar — desktop (md+) only. Below md, nav is the fixed bottom tab
          bar instead (see MobileTabBar / the 2026-08-24 "7" mobile design
          doc) — no more hamburger/sliding drawer on phones. */}
      <div className="flex min-h-screen">
        <aside className="no-print sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col bg-ink text-[#f3f2f2] md:flex">
          <Logo tone="ink" fill full border={false} shadow />

          <nav className="flex flex-col overflow-y-auto py-2">
            {visibleGroups.map((group) => (
              <div key={group.label ?? "beranda"}>
                {group.label && (
                  <div
                    className={`px-5 pb-1.5 pt-4 font-sans text-[9.5px] font-semibold uppercase tracking-[0.16em] ${
                      group.items.some((item) => isActive(pathname, item.href)) ? "text-accent" : "text-white/35"
                    }`}
                  >
                    {group.label}
                  </div>
                )}
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const badgeValue = item.badge === "invoiceCount" ? counts.invoiceCount : counts.produkBaru;
                  const showBadge = badgeValue > 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`grid items-center gap-2.5 px-5 py-[9px] text-[13.5px] no-underline transition ${
                        showBadge ? "grid-cols-[18px_1fr_auto]" : "grid-cols-[18px_1fr]"
                      } ${
                        active
                          ? "bg-accent py-2.5 font-bold text-white"
                          : "font-normal text-white/82 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <NavIcon name={item.icon} />
                      {item.label}
                      {showBadge && item.badge === "invoiceCount" && (
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-bold ${
                            active ? "bg-white text-accent" : "bg-accent text-white"
                          }`}
                        >
                          {badgeValue}
                        </span>
                      )}
                      {showBadge && item.badge === "produkBaru" && (
                        <span
                          className={`border px-1.5 py-0.5 text-[10px] font-semibold ${
                            active
                              ? "border-white/60 text-white"
                              : "border-white/30 text-white/70"
                          }`}
                        >
                          {badgeValue} Produk Baru
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="mt-auto border-t border-white/20 px-5 py-[14px] text-[11px] leading-relaxed text-white/55">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[12px] font-medium text-white/85">{user.nama}</div>
                <div className="text-[10.5px] text-white/45">{ROLE_LABEL[user.role]}</div>
              </div>
              <LogoutButton className="cursor-pointer border border-white/25 px-2.5 py-1.5 text-[10px] font-semibold text-white/80 hover:border-accent hover:text-white">
                Keluar
              </LogoutButton>
            </div>
          </div>
        </aside>

        <main id="main-content" className="min-w-0 flex-1 border-l border-line pb-[58px] md:pb-0">
          {children}
        </main>
      </div>

      <MobileTabBar role={user.role} />
    </div>
  );
}
