import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type Variant = "solid" | "ghost" | "clay" | "violet" | "gold";

const VARIANT_CLASS: Record<Variant, string> = {
  solid: "border-ink bg-ink text-paper hover:opacity-90",
  ghost: "border-ink bg-transparent text-ink hover:bg-ink hover:text-paper",
  clay: "border-clay bg-clay text-white hover:opacity-90",
  violet: "border-violet bg-violet text-white hover:opacity-90",
  gold: "border-gold bg-gold text-[#1b1200] hover:opacity-90",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded border px-4.5 py-2.5 font-sans text-[0.85rem] font-medium cursor-pointer transition disabled:cursor-not-allowed disabled:opacity-50";

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
