export default function StatCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: string;
}) {
  return (
    <div className="rounded-xl bg-panel p-4.5 shadow-sm">
      <div className="font-sans text-[0.68rem] tracking-wide text-muted uppercase">{label}</div>
      <div className="mt-1.5 font-sans text-[1.9rem] font-extrabold leading-none tracking-tight">
        {value}
      </div>
      {delta && <div className={`mt-2 font-sans text-[0.7rem] text-accent-700`}>{delta}</div>}
    </div>
  );
}
