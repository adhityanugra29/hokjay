import Link from "next/link";

export default function MenuTile({
  href,
  icon,
  title,
  desc,
  color,
  featured,
}: {
  href: string;
  icon: string;
  title: string;
  desc: string;
  color: string;
  featured?: boolean;
}) {
  if (featured) {
    return (
      <Link
        href={href}
        className="relative flex flex-col gap-2.5 overflow-hidden rounded-lg bg-linear-to-br from-[#0e9c62] to-[#0a7a4d] p-5 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-white/20 text-xl">
          {icon}
        </div>
        <div className="font-serif text-[1.05rem] font-semibold">{title}</div>
        <div className="font-mono text-[0.7rem] leading-relaxed text-white/80">{desc}</div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      style={{ borderLeftColor: color }}
      className="relative flex flex-col gap-2.5 rounded-lg border border-line border-l-4 bg-panel p-5 text-ink shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div
        className="flex h-11 w-11 items-center justify-center rounded-[10px] text-xl"
        style={{ background: `color-mix(in srgb, ${color} 15%, white)` }}
      >
        {icon}
      </div>
      <div className="font-serif text-[1.05rem] font-semibold">{title}</div>
      <div className="font-mono text-[0.7rem] leading-relaxed text-muted">{desc}</div>
    </Link>
  );
}
