export default function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-line bg-paper px-6 py-5 pl-16 pr-[110px] md:pl-9">
      <div>
        {subtitle && (
          <div className="mb-2 font-sans text-xs uppercase tracking-[0.12em] text-accent">
            {subtitle}
          </div>
        )}
        <h1 className="font-sans text-2xl font-extrabold">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </div>
  );
}
