import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type Variant = "solid" | "ghost" | "clay" | "violet" | "gold";

// All four "accent" variants collapse to the same single accent color —
// only solid (primary) vs ghost (secondary) is a meaningful distinction now.
const VARIANT_CLASS: Record<Variant, string> = {
  solid: "border-accent bg-accent text-ink hover:bg-accent-600",
  ghost: "border-line bg-transparent text-ink hover:bg-black/5",
  clay: "border-accent bg-accent text-ink hover:bg-accent-600",
  violet: "border-accent bg-accent text-ink hover:bg-accent-600",
  gold: "border-accent bg-accent text-ink hover:bg-accent-600",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded border px-4.5 py-2.5 font-sans text-[0.85rem] font-extrabold cursor-pointer transition disabled:cursor-not-allowed disabled:opacity-50";

export function Button({
  variant = "solid",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${base} ${VARIANT_CLASS[variant]} ${className}`} {...props} />;
}

export function LinkButton({
  variant = "solid",
  href,
  className = "",
  children,
}: {
  variant?: Variant;
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`${base} ${VARIANT_CLASS[variant]} ${className}`}>
      {children}
    </Link>
  );
}
