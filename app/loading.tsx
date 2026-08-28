"use client";

import { useEffect, useState } from "react";
import { LoadingOverlayContent } from "@/components/ui/LoadingOverlay";

// How long a navigation has to take before we bother showing anything.
// Below this, popping the overlay up just reads as a jarring flash for a
// transition that was already basically instant — per the user's report
// 2026-08-28 that navbar navigation "felt slow" specifically because of
// this popup appearing immediately on every click, not because navigation
// itself was actually slow.
const APPEAR_DELAY_MS = 400;

/**
 * Next.js's route-level Suspense boundary — shown automatically while a
 * page segment's server component is fetching (every page in this app
 * does a real DB query), so this covers every page-to-page navigation
 * with no per-page work. Per the user's request 2026-08-25.
 *
 * Delayed on purpose (2026-08-28): this component remounts fresh each time
 * the boundary suspends, so the timer below naturally never fires — and
 * the overlay never renders — for any navigation that finishes within
 * APPEAR_DELAY_MS. Only a genuinely slow page load holds this boundary up
 * long enough to actually show it.
 */
export default function Loading() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), APPEAR_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return <LoadingOverlayContent />;
}
