export default function FollowUpStatusBadge({ status }: { status: "draft" | "unpaid" }) {
  return (
    <span
      className={`border px-2 py-0.5 font-sans text-[0.62rem] font-semibold uppercase tracking-wide ${
        status === "draft"
          ? "border-yellow-400 bg-yellow-50 text-yellow-700"
          : "border-red-400 bg-red-50 text-red-700"
      }`}
    >
      {status === "draft" ? "Draft" : "Belum Bayar"}
    </span>
  );
}
