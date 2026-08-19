const ACCENT_CLASS: Record<string, string> = {
  moss: "before:bg-moss",
  teal: "before:bg-teal-bright",
  gold: "before:bg-gold",
  violet: "before:bg-violet",
  clay: "before:bg-clay",
};

const DELTA_CLASS: Record<string, string> = {
  up: "text-moss",
  warn: "text-clay",
  violet: "text-violet",
  gold: "text-[#8a6415]",
  muted: "text-muted",
};

export default function StatCard({
  label,
  value,
  delta,
  accent = "moss",
  deltaTone = "muted",
}: {
  label: string;
  value: string;
  delta?: string;
  accent?: keyof typeof ACCENT_CLASS;
  deltaTone?: keyof typeof DELTA_CLASS;
}) {
  return (
    <div
      className={`relative border border-line bg-panel p-4.5 pl-6 before:absolute before:top-4 before:bottom-4 before:left-0 before:w-[3px] before:content-[''] ${ACCENT_CLASS[accent]}`}
    >
      <div className="font-mono text-[0.68rem] tracking-wide text-muted uppercase">{label}</div>
      <div className="mt-1.5 font-serif text-[1.9rem] font-semibold">{value}</div>
      {delta && <div className={`mt-1.5 font-mono text-[0.7rem] ${DELTA_CLASS[deltaTone]}`}>{delta}</div>}
    </div>
  );
}
