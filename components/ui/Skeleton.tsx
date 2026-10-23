/** A pulsing placeholder block — the building piece of every loading skeleton. */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-surface ${className}`} />;
}
