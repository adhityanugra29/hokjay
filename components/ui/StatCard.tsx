// Accent/delta tones all collapse to the single accent color now — the
// prop is kept so call sites don't need touching, but every value renders
// the same, apart from "muted" which stays neutral.
const DELTA_CLASS: Record<string, string> = {
  up: "text-accent-700",
  warn: "text-accent",
  violet: "text-accent",
  gold: "text-accent",
  muted: "text-muted",
};

export default function StatCard({
  label,
  value,
  delta,
  deltaTone = "muted",
}: {
  label: string;
  value: string;
  delta?: string;
  accent?: string;
  deltaTone?: keyof typeof DELTA_CLASS;
}) {
  return (
    <div className="border-2 border-line bg-panel p-4.5">
      <div className="font-sans text-[0.68rem] tracking-wide text-muted uppercase">{label}</div>
      <div className="mt-1.5 font-sans text-[1.9rem] font-extrabold leading-none tracking-tight">
        {value}
      </div>
      {delta && <div className={`mt-2 font-sans text-[0.7rem] ${DELTA_CLASS[deltaTone]}`}>{delta}</div>}
    </div>
  );
}
