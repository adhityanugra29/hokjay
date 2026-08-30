"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SubnavTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <div className="mb-5 flex gap-1.5 overflow-x-auto border-b-2 border-line">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-0.5 shrink-0 border-b-2 px-4 py-2.5 font-sans text-[0.75rem] whitespace-nowrap ${
              active
                ? "border-accent font-extrabold text-accent-700"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
