"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Back/Home controls — used to be viewport-fixed fabs floating over every
 * page (which needed PageHeader's own actions to reserve right-padding so
 * they wouldn't get covered). Now rendered in-flow at the top-right corner
 * of PageHeader itself instead, styled as quiet flat icon buttons matching
 * the rest of the UI (same treatment as the Hot Products carousel's slide
 * arrows) rather than a bold floating overlay. See confirmation with the
 * user 2026-08-20.
 */
export default function BackHomeControls() {
  const router = useRouter();

  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        onClick={() => router.back()}
        title="Kembali"
        className="flex h-8 w-8 cursor-pointer items-center justify-center border border-line font-mono text-muted hover:border-accent hover:text-accent"
      >
        ←
      </button>
      <Link
        href="/"
        title="Kembali ke Dasbor"
        className="flex h-8 w-8 items-center justify-center border border-line font-mono text-muted no-underline hover:border-accent hover:text-accent"
      >
        ⌂
      </Link>
    </div>
  );
}
