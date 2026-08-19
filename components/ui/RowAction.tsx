import Link from "next/link";

const cls =
  "inline-block cursor-pointer rounded-full border border-moss bg-panel px-3 py-1.5 font-mono text-[0.7rem] font-medium leading-tight text-moss-deep no-underline transition hover:bg-moss hover:text-white";

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
