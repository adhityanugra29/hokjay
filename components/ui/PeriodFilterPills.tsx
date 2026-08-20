import Link from "next/link";

export default function PeriodFilterPills({
  basePath,
  periods,
  active,
}: {
  basePath: string;
  periods: { value: string; label: string }[];
  active: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {periods.map((p) => {
        const isActive = p.value === active;
        return (
          <Link
            key={p.value}
            href={`${basePath}?period=${p.value}`}
            className={`border px-3.5 py-2 font-sans text-[0.75rem] ${
              isActive
                ? "border-accent bg-accent text-white"
                : "border-line bg-panel text-muted hover:border-accent hover:text-ink"
            }`}
          >
            {p.label}
          </Link>
        );
      })}
    </div>
  );
}
