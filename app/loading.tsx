import { LoadingOverlayContent } from "@/components/ui/LoadingOverlay";

/**
 * Next.js's route-level Suspense boundary — shown automatically while a
 * page segment's server component is fetching (every page in this app
 * does a real DB query), so this covers every page-to-page navigation
 * with no per-page work. Per the user's request 2026-08-25.
 */
export default function Loading() {
  return <LoadingOverlayContent />;
}
