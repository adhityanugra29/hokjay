"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div>
      {/* Hamburger — mobile only */}
      <button
        type="button"
        aria-label="Buka menu"
        onClick={() => setOpen(true)}
        className="no-print fixed left-3 top-3 z-40 flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-full border border-line bg-panel shadow md:hidden"
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
          className={`no-print fixed inset-y-0 left-0 z-50 flex w-[230px] shrink-0 flex-col gap-8 bg-moss-deep p-6 text-[#eae5d6] transition-transform md:static md:z-auto md:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-baseline gap-2 font-serif text-xl font-semibold">
            CV HORECA JAYA
            <span className="font-mono text-[0.65rem] font-normal text-[#a9c2b6]">PREVIEW</span>
          </div>

          <nav className="flex flex-col gap-1.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  style={
                    active
                      ? { background: item.color, color: "#12201d", borderLeftColor: "#fff" }
                      : { borderLeftColor: item.color }
                  }
                  className={`flex items-center gap-2.5 rounded-l rounded-r-lg border-l-4 px-3 py-2.5 text-[0.86rem] font-medium shadow-[0_1px_0_rgba(0,0,0,0.15)] transition ${
                    active
                      ? "shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
                      : "bg-white/5 text-[#eae5d6] hover:translate-x-0.5 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span
                    className="w-5 font-mono text-[0.68rem] font-semibold"
                    style={{ color: active ? "#12201d" : item.color }}
                  >
                    {item.num}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto font-mono text-[0.68rem] leading-relaxed text-[#6f8c7f]">
            DATA SUMBER
            <br />
            MongoDB Atlas — tersambung
          </div>
        </aside>

        <main id="main-content" className="min-w-0 flex-1 pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-line bg-panel md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 whitespace-nowrap px-3 py-2.5 text-center font-mono text-[0.65rem] ${
                active ? "font-semibold text-moss-deep" : "text-muted"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Back / Home fabs */}
      <button
        type="button"
        onClick={() => router.back()}
        title="Kembali"
        className="no-print fixed right-16 top-3.5 z-40 flex h-[42px] w-[42px] items-center justify-center rounded-full border border-line bg-panel font-mono text-lg text-ink shadow-md"
      >
        ←
      </button>
      <Link
        href="/"
        title="Kembali ke Dasbor"
        className="no-print fixed right-3.5 top-3.5 z-40 flex h-[42px] w-[42px] items-center justify-center rounded-full border border-white/15 bg-ink font-mono text-lg text-paper shadow-md"
      >
        ⌂
      </Link>
    </div>
  );
}
