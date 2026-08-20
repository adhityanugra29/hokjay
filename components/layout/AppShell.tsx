"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import { isAllowedPage } from "@/lib/auth/access";
import type { UserRole } from "@/models/User";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

const ROLE_LABEL: Record<UserRole, string> = {
  sales: "Sales",
  finance: "Finance",
  admin: "Admin",
};

export default function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { nama: string; role: UserRole } | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // /login renders its own centered layout — no sidebar chrome around it.
  if (pathname === "/login" || !user) {
    return <>{children}</>;
  }

  const visibleNavItems = NAV_ITEMS.filter((item) => isAllowedPage(user.role, item.href));

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
          className={`no-print fixed inset-y-0 left-0 z-50 flex w-[240px] shrink-0 flex-col bg-ink text-[#f3f2f2] transition-transform md:static md:z-auto md:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="border-b-2 border-white/25 px-[22px] py-[18px]">
            <div className="font-sans text-[17px] font-extrabold leading-tight tracking-tight">
              CV HORECA JAYA
            </div>
            <div className="mt-1.5 font-sans text-[10px] uppercase tracking-[0.12em] text-white/50">
              Kelola usaha
            </div>
          </div>

          <nav className="flex flex-col py-2.5">
            {visibleNavItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`grid grid-cols-[26px_1fr] items-center gap-2.5 px-[22px] py-[11px] text-[14px] no-underline transition ${
                    active
                      ? "bg-accent font-extrabold text-white"
                      : "font-normal text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className={`text-[10px] ${active ? "text-white/80" : "text-white/50"}`}>
                    {item.num}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-white/20 px-[22px] py-[18px] text-[11px] leading-relaxed text-white/55">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-medium text-white/80">{user.nama}</div>
                <div className="text-white/50">{ROLE_LABEL[user.role]}</div>
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
