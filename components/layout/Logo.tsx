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
  full = false,
  fill = false,
  border = true,
  shadow = false,
  className = "",
}: {
  /** "ink" for light backgrounds (black border/text), "white" for dark/accent backgrounds. */
  tone?: "ink" | "white";
  size?: "sm" | "md" | "lg";
  /** Block-level, full width of its container — for use as a header bar (e.g. the sidebar). */
  full?: boolean;
  /** Paints an explicit background (white box on "ink" tone, black box on "white" tone) so the
   * mark reads as a solid card sitting on a contrasting page background, instead of being
   * transparent — needed whenever the surrounding background isn't already that color itself. */
  fill?: boolean;
  /** Set false to drop the boxed outline — e.g. a full-width header bar that should blend into
   * its background instead of reading as a separate boxed card. */
  border?: boolean;
  /** Soft drop shadow instead of a hard outline, so a filled card eases into the background
   * behind it (e.g. the sidebar's white-on-black header) rather than cutting off sharply. */
  shadow?: boolean;
  className?: string;
}) {
  const borderColor = tone === "white" ? "border-white" : "border-ink";
  const textColor = tone === "white" ? "text-white" : "text-ink";
  const ruleColor = tone === "white" ? "bg-white" : "bg-ink";
  // Literal rgba() instead of Tailwind's "text-white/70" opacity-modifier
  // syntax on purpose — Tailwind v4 compiles that via CSS color-mix(),
  // which html2canvas can't parse and aborts on, silently breaking PDF
  // downloads wherever this component ends up inside html2canvas's capture
  // (e.g. CatalogPrintDoc's cover). Matches the same rgba()-literal
  // convention CatalogPrintDoc already used elsewhere for this exact reason.
  const captionColor = tone === "white" ? "text-[rgba(255,255,255,0.7)]" : "text-muted";
  // On a colored/dark background the badge inverts (white fill, accent
  // text) instead of the usual accent fill — otherwise an accent badge
  // vanishes against an accent-colored cover (see CatalogPrintDoc's cover).
  // text-accent-700 (not plain text-accent) on the white-fill branch —
  // the accent is yellow now, illegible as plain text on a white chip.
  const badgeColor = tone === "white" ? "bg-white text-accent-700" : "bg-accent text-ink";
  const bgColor = fill ? (tone === "white" ? "bg-ink" : "bg-white") : "";
  // 1px, not 2 — a 2px outline read as too heavy/wide once scaled up in the
  // katalog PDF (html2canvas renders at scale:2). Per the user's feedback
  // 2026-08-23.
  const borderClass = border ? `border ${borderColor}` : "";
  const shadowClass = shadow ? "shadow-[0_8px_24px_-4px_rgba(0,0,0,0.55)]" : "";

  // Fixed pixel width per size, instead of letting the box shrink-to-fit —
  // shrink-to-fit is ambiguous here (the browser can pick either the
  // wordmark's or the caption row's intrinsic width to drive it, and
  // Chromium picked the caption row, leaving "HOJAY" looking too small with
  // slack on both sides). A known width lets both the rule and the caption
  // row reliably span edge-to-edge like the reference mockup, with the
  // wordmark's tracking tuned to roughly fill it too.
  const dims = full
    ? { pad: "px-5", word: "text-[1.5rem]", caption: "text-[9px]", badge: "px-1.5 py-0.5 text-[9px]", width: "" }
    : size === "sm"
      ? { pad: "px-2.5 py-1.5", word: "text-[0.85rem]", caption: "text-[6.5px]", badge: "px-1 py-px text-[6.5px]", width: "w-[128px]" }
      : size === "lg"
        ? { pad: "px-4 py-3", word: "text-[1.6rem]", caption: "text-[9px]", badge: "px-1.5 py-0.5 text-[9px]", width: "w-[232px]" }
        : { pad: "px-3 py-2", word: "text-[1.15rem]", caption: "text-[8px]", badge: "px-1 py-0.5 text-[8px]", width: "w-[172px]" };

  // The sidebar's full-width mark is the height benchmark for every
  // PageHeader in the app (min-h-[100px], see PageHeader.tsx) — vertically
  // centered instead of relying on py-4 so it lands at exactly that height
  // regardless of font-metric rounding. Confirmed with the user 2026-08-23.
  const fullHeightClass = full ? "flex min-h-[100px] flex-col justify-center" : "";

  return (
    <div className={`${full ? `block w-full ${fullHeightClass}` : `block ${dims.width}`} ${borderClass} ${bgColor} ${shadowClass} ${dims.pad} ${className}`}>
      <div className={`font-sans font-extrabold leading-none tracking-[0.14em] ${textColor} ${dims.word}`}>HOJAY</div>
      <div className={`my-1.5 h-px w-full ${ruleColor}`} />
      <div className="flex w-full items-center justify-between gap-2">
        <span className={`font-mono font-semibold uppercase tracking-[0.14em] ${captionColor} ${dims.caption}`}>
          Kitchen Equipment
        </span>
        <span className={`font-mono font-bold ${badgeColor} ${dims.badge}`}>ID</span>
      </div>
    </div>
  );
}
