const CLASS: Record<string, string> = {
  ok: "bg-[#d7f2e6] text-[#087a52]",
  low: "bg-[#fdead0] text-[#a5620a]",
  out: "bg-[#fbdad4] text-[#c02c1c]",
  paid: "bg-[#d7f2e6] text-[#087a52]",
  unpaid: "bg-[#fdead0] text-[#a5620a]",
  draft: "bg-[#e9e5f5] text-[#4a3d8f]",
};

export type PillVariant = keyof typeof CLASS;

export default function Pill({ variant, children }: { variant: PillVariant; children: React.ReactNode }) {
  return (
    <span className={`inline-block px-2.5 py-1 font-sans text-[0.68rem] font-semibold ${CLASS[variant]}`}>
      {children}
    </span>
  );
}
