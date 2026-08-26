// "sepi" (2026-08-26) — a dormant customer row on the Sales homepage, not an
// invoice status at all, but visually it's the same "what needs attention"
// badge language, so it lives here rather than a one-off duplicate.
export default function FollowUpStatusBadge({ status }: { status: "draft" | "unpaid" | "sepi" }) {
  const style =
    status === "draft"
      ? "border-yellow-400 bg-yellow-50 text-yellow-700"
      : status === "unpaid"
        ? "border-red-400 bg-red-50 text-red-700"
        : "border-line bg-surface text-muted";
  return (
    <span className={`border px-2 py-0.5 font-sans text-[0.62rem] font-semibold uppercase tracking-wide ${style}`}>
      {status === "draft" ? "Draft" : status === "unpaid" ? "Belum Bayar" : "Sepi"}
    </span>
  );
}
