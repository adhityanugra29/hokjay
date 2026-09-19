// "sepi" (2026-08-26) — a dormant customer row on the Sales homepage, not an
// invoice status at all, but visually it's the same "what needs attention"
// badge language, so it lives here rather than a one-off duplicate.
//
// "dp" (2026-08-31) — an "unpaid" invoice that already has a DP recorded
// (see FollowUpInvoiceRow.hasDp) reads as "Sudah DP", not lumped in with a
// plain "Belum Bayar" — per the user's report ("jika sudah DP, berikan
// status DP nya jangan belum bayar"). Same blue already used for this exact
// state on Katalog's product badges (ProductCard.tsx's "Sudah DP" pill),
// so the color means the same thing everywhere in the app.
//
// "paid" (2026-09-19) — a fully-paid invoice that still shows up on
// Beranda's "Perlu Dikirim" widget (see getShippingPriorityInvoices) reads
// as "Lunas", same green already used for "paid" everywhere else (Pill.tsx).
export default function FollowUpStatusBadge({ status }: { status: "draft" | "unpaid" | "dp" | "paid" | "sepi" }) {
  const style =
    status === "draft"
      ? "border-yellow-400 bg-yellow-50 text-yellow-700"
      : status === "unpaid"
        ? "border-red-400 bg-red-50 text-red-700"
        : status === "dp"
          ? "border-[#0369A1]/40 bg-[#0369A1]/10 text-[#0369A1]"
          : status === "paid"
            ? "border-emerald-400 bg-emerald-50 text-emerald-700"
            : "border-line bg-surface text-muted";
  const label =
    status === "draft"
      ? "Draft"
      : status === "unpaid"
        ? "Belum Bayar"
        : status === "dp"
          ? "Sudah DP"
          : status === "paid"
            ? "Lunas"
            : "Sepi";
  return (
    <span className={`whitespace-nowrap border px-2 py-0.5 font-sans text-[0.62rem] font-semibold uppercase tracking-wide ${style}`}>
      {label}
    </span>
  );
}
