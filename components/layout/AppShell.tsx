"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "@/lib/nav";
import { isAllowedPage } from "@/lib/auth/access";
import NavIcon from "./NavIcons";
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
};

export interface NavBadgeCounts {
  invoiceCount: number;
  lowStock: number;
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
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // /login renders its own centered layout — no sidebar chrome around it.
  if (pathname === "/login" || !user) {
    return <>{children}</>;
  }

  const counts = badgeCounts ?? { invoiceCount: 0, lowStock: 0 };
  const visibleGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => isAllowedPage(user.role, item.href)),
  })).filter((g) => g.items.length > 0);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    // Hard navigation — see the matching note in app/login/page.tsx.
    window.location.href = "/login";
  }

  return (
    <div>
      {/* Hamburger — mobile only */}
      <button
        type="button"
        aria-label="Buka menu"
        onClick={() => setOpen(true)}
        className="no-print fixed left-3 top-3 z-40 flex h-10 w-10 flex-col items-center justify-center gap-1.5 border border-line bg-panel md:hidden"
      >
        <span className="block h-0.5 w-5 bg-ink" />
        <span className="block h-0.5 w-5 bg-ink" />
        <span className="block h-0.5 w-5 bg-ink" />
      </button>

      {/* Overlay — mobile only, shown while sidebar is open */}
      {open && (
        <div
          className="no-print fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-h-screen">
        <aside
          className={`no-print fixed inset-y-0 left-0 z-50 flex w-[248px] shrink-0 flex-col bg-ink text-[#f3f2f2] transition-transform md:static md:z-auto md:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="border-b-2 border-white/25 px-5 py-[18px]">
            <div className="font-sans text-[16px] font-extrabold leading-tight tracking-tight">
              CV HORECA JAYA
            </div>
            <div className="mt-1.5 font-sans text-[9.5px] uppercase tracking-[0.16em] text-white/45">
              Kelola usaha
            </div>
          </div>

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
                  const badgeValue = item.badge === "invoiceCount" ? counts.invoiceCount : counts.lowStock;
                  const showBadge = badgeValue > 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
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
                      {showBadge && item.badge === "lowStock" && (
                        <span
                          className={`border px-1.5 py-0.5 text-[10px] font-semibold ${
                            active
                              ? "border-white/60 text-white"
                              : "border-white/30 text-white/70"
                          }`}
                        >
                          {badgeValue} tipis
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
              <button
                type="button"
                onClick={handleLogout}
                className="cursor-pointer border border-white/25 px-2.5 py-1.5 text-[10px] font-semibold text-white/80 hover:border-accent hover:text-white"
              >
                Keluar
              </button>
            </div>
          </div>
        </aside>

        <main id="main-content" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
