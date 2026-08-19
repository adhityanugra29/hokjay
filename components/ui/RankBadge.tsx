const CLASS: Record<number, string> = {
  1: "bg-linear-to-br from-gold to-clay text-white",
  2: "bg-[#d9dbe0] text-[#3a3d47]",
  3: "bg-[#d8a878] text-[#4a3018]",
};

export default function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={`inline-flex h-[26px] w-[26px] items-center justify-center rounded-full font-mono text-[0.75rem] font-semibold ${
        CLASS[rank] ?? "bg-paper text-muted"
      }`}
    >
      {rank}
    </span>
  );
}
