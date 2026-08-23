/**
 * Brand mark — "2b. Penandaan Peti" (crate-stencil style) design the user
 * supplied 2026-08-23: a bordered box with "HOJAY" as the big wordmark,
 * a rule, then "KITCHEN EQUIPMENT" + a red "ID" badge underneath. Pure
 * CSS/typography (no image asset), so it adapts to light or dark
 * backgrounds via `tone` and scales via `size`.
 */
export default function Logo({
  tone = "ink",
  size = "md",
  className = "",
}: {
  /** "ink" for light backgrounds (black border/text), "white" for dark/accent backgrounds. */
  tone?: "ink" | "white";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const borderColor = tone === "white" ? "border-white" : "border-ink";
  const textColor = tone === "white" ? "text-white" : "text-ink";
  const ruleColor = tone === "white" ? "bg-white" : "bg-ink";
  const captionColor = tone === "white" ? "text-white/70" : "text-muted";
  // On a colored/dark background the badge inverts (white fill, accent
  // text) instead of the usual accent fill — otherwise an accent-red badge
  // vanishes against an accent-red cover (see CatalogPrintDoc's cover).
  const badgeColor = tone === "white" ? "bg-white text-accent" : "bg-accent text-white";

  const dims =
    size === "sm"
      ? { pad: "px-2.5 py-1.5", word: "text-[0.85rem]", caption: "text-[6.5px]", badge: "px-1 py-px text-[6.5px]", gap: "gap-1" }
      : size === "lg"
        ? { pad: "px-4 py-3", word: "text-[1.6rem]", caption: "text-[9px]", badge: "px-1.5 py-0.5 text-[9px]", gap: "gap-2" }
        : { pad: "px-3 py-2", word: "text-[1.15rem]", caption: "text-[8px]", badge: "px-1 py-0.5 text-[8px]", gap: "gap-1.5" };

  return (
    <div className={`inline-block border-2 ${borderColor} ${dims.pad} ${className}`}>
      <div className={`font-sans font-extrabold leading-none tracking-tight ${textColor} ${dims.word}`}>HOJAY</div>
      <div className={`my-1 h-px w-full ${ruleColor}`} />
      <div className={`flex items-center ${dims.gap}`}>
        <span className={`font-mono font-semibold uppercase tracking-[0.14em] ${captionColor} ${dims.caption}`}>
          Kitchen Equipment
        </span>
        <span className={`font-mono font-bold ${badgeColor} ${dims.badge}`}>ID</span>
      </div>
    </div>
  );
}
