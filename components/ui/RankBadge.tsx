const CLASS: Record<number, string> = {
  1: "bg-accent text-white",
  2: "bg-surface text-ink",
  3: "bg-surface text-ink",
};

export default function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={`inline-flex h-[26px] w-[26px] items-center justify-center font-sans text-[0.75rem] font-extrabold ${
        CLASS[rank] ?? "bg-paper text-muted"
      }`}
    >
      {rank}
    </span>
  );
}
