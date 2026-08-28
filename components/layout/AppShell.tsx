"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "@/lib/nav";
import { isAllowedPage } from "@/lib/auth/access";
import NavIcon from "./NavIcons";
import NavBadge from "./NavBadge";
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
  super_admin: "Super Admin",
  manager: "Manager Hojay",
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
  /** A bare (unawaited) Promise — see NavBadge.tsx for why. */
  badgeCounts?: Promise<NavBadgeCounts>;
}) {
  const pathname = usePathname();

  // /login renders its own centered layout — no sidebar chrome around it.
  if (pathname === "/login" || !user) {
    return <>{children}</>;
  }

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
                  // Grid always reserves the 3rd (badge) track when this item
                  // has a badge type at all — the actual count isn't known
                  // synchronously anymore (it's behind Suspense, see
                  // NavBadge.tsx), so this can't wait for "is it > 0" the way
                  // it used to. NavBadge itself renders null for a 0 count,
                  // and an empty `auto` track just collapses to no width —
                  // same visual result, no layout jump once it resolves.
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`grid items-center gap-2.5 px-5 py-[9px] text-[13.5px] no-underline transition ${
                        item.badge ? "grid-cols-[18px_1fr_auto]" : "grid-cols-[18px_1fr]"
                      } ${
                        active
                          ? "bg-accent py-2.5 font-bold text-white"
                          : "font-normal text-white/82 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <NavIcon name={item.icon} />
                      {item.label}
                      {item.badge && badgeCounts && (
                        <Suspense fallback={null}>
                          <NavBadge type={item.badge} active={active} promise={badgeCounts} />
                        </Suspense>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="mt-auto border-t border-white/20 px-5 py-[14px] text-[11px] leading-relaxed text-white/55">
            <div className="flex items-center justify-between gap-2">
              <Link href="/akun-saya" className="min-w-0 no-underline hover:opacity-80">
                <div className="truncate text-[12px] font-medium text-white/85">{user.nama}</div>
                <div className="text-[10.5px] text-white/45">{ROLE_LABEL[user.role]}</div>
              </Link>
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
