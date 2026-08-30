/**
 * Section-card wrapper for a form — "Foundry" redesign (2026-08-30):
 * replaces one flat label+input grid (the old bare <Panel><FormGrid>...)
 * with a titled card split into labeled sections, matching the confirmed
 * "HOJAY Shell — Foundry" mockup. Deliberately does NOT touch Field/Input/
 * FormGrid/CurrencyInput/etc. (components/ui/Form.tsx) — those stay exactly
 * as they are and are still used unchanged *inside* each section, so every
 * other form in the app that doesn't opt into FormCard/FormSection is
 * completely unaffected. First used by CustomerForm.tsx and ProductForm.tsx.
 */
export function FormCard({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto overflow-hidden rounded-2xl bg-panel shadow-md ${className}`}>
      <div className="border-b border-line px-6 py-5">
        <h2 className="font-sans text-[1.05rem] font-extrabold text-ink">{title}</h2>
        {description && <p className="mt-1 font-sans text-[0.8rem] text-muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function FormSection({
  label,
  children,
  last,
  /** Denser padding/gaps — for a form filled many times a day (e.g.
   * Inventory), where speed of entry matters more than breathing room.
   * Per the user's request 2026-08-30 ("kecepatan menjadi salah satu
   * kunci kesuksesan di form ini"). */
  compact,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`${compact ? "px-5 py-3.5" : "px-6 py-5"} ${!last ? "border-b border-line" : ""}`}>
      <div
        className={`flex items-center gap-2 font-sans font-semibold uppercase tracking-wide text-accent-700 ${
          compact ? "mb-2.5 text-[0.6rem]" : "mb-3.5 text-[0.64rem]"
        }`}
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
        {label}
      </div>
      {children}
    </div>
  );
}

export function FormCardActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2.5 px-6 py-5">{children}</div>;
}
