// "Soft Trade"/Foundry treatment (2026-08-30) — hard border-2 -> shadow +
// rounded corners, matching every other card surface already redesigned
// this round (ProductCard, StatCard, drawers, forms). No overflow-hidden
// here on purpose — this wraps a lot of different content app-wide
// (including forms with dropdown pickers like SearchableSelect that
// position themselves absolutely and may need to render past the
// panel's own edge); PanelHead gets its own matching top corners instead
// so the two most common flush-edge cases (a PanelHead sitting right at
// the top) still look right without needing to clip everything else.
export function Panel({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} className={`rounded-2xl bg-panel shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function PanelHead({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-t-2xl border-b border-line bg-surface px-5 py-3.5">
      <h2 className="font-sans text-[0.95rem] font-extrabold text-ink">{title}</h2>
      {children}
    </div>
  );
}

export function SearchInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  // Full width below sm, capped at 220px from sm up — per the user's
  // request 2026-08-26 ("responsif dengan tabelnya"): the fixed 220px was
  // cramped/undersized relative to the full-width table/card list it sits
  // above on a phone screen. The wrapping <form> at each call site also
  // needs w-full sm:w-auto for this to actually stretch (a bare <form> has
  // no width of its own to fill).
  return (
    <input
      {...props}
      className="w-full rounded-lg border border-line bg-surface px-3 py-2 font-sans text-[0.78rem] text-ink sm:w-[220px]"
    />
  );
}

export function TableScroll({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}
