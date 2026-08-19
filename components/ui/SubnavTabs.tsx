"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SubnavTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <div className="mb-5 flex gap-1.5 border-b border-line">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-px border-b-2 px-4 py-2.5 font-mono text-[0.75rem] ${
              active
                ? "border-moss font-medium text-moss-deep"
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
