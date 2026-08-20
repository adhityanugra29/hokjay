import Link from "next/link";

const cls =
  "inline-block cursor-pointer border border-accent bg-panel px-3 py-1.5 font-sans text-[0.7rem] font-semibold leading-tight text-accent no-underline transition hover:bg-accent hover:text-white";

export function RowActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export function RowActionButton({
  onClick,
  children,
  type = "button",
}: {
  onClick?: () => void;
  children: React.ReactNode;
  type?: "button" | "submit";
}) {
  return (
    <button type={type} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
