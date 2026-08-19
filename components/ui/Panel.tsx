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
    <div id={id} className={`border border-line bg-panel ${className}`}>
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
    <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line bg-[#ece6d6] px-5 py-3.5">
      <h2 className="font-sans text-[0.95rem] font-semibold text-ink">{title}</h2>
      {children}
    </div>
  );
}

export function SearchInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-[220px] rounded border border-line bg-paper px-3 py-2 font-mono text-[0.78rem] text-ink"
    />
  );
}

export function TableScroll({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}
