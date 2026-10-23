"use client";

import { useLinkStatus } from "next/link";

/** A tiny pulsing dot shown inside a <Link> while its navigation is pending (absolute, so it never shifts layout). Must be rendered as a descendant of the Link. */
export default function LinkPending({ className = "right-2 top-1/2 -translate-y-1/2" }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-accent transition-opacity ${className} ${
        pending ? "animate-pulse opacity-100" : "opacity-0"
      }`}
    />
  );
}
