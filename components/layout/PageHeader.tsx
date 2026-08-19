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
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-linear-to-r from-[#fff3c4] to-white px-6 py-5 pl-16 md:pl-9">
      <div>
        <h1 className="font-serif text-2xl font-semibold">{title}</h1>
        {subtitle && (
          <div className="mt-1 font-mono text-xs text-muted uppercase">{subtitle}</div>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </div>
  );
}
