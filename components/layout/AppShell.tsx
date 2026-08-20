"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

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
            {NAV_ITEMS.map((item) => {
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
            MongoDB Atlas — tersambung
          </div>
        </aside>

        <main id="main-content" className="min-w-0 flex-1 pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t-2 border-line bg-panel md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 whitespace-nowrap px-3 py-2.5 text-center text-[0.65rem] ${
                active ? "font-extrabold text-accent" : "text-muted"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
