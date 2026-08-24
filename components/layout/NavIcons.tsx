/**
 * Sidebar nav icons — small stroke SVGs ported from the "Rak & Rel v2"
 * design doc (viewBox 0 0 20 20, stroke-width 1.7, round caps/joins).
 * Purchasing/Bayar Tagihan didn't exist when the doc was made, so those two
 * are original strokes in the same visual language.
 */
export type NavIconName =
  | "home"
  | "cart"
  | "grid"
  | "document"
  | "users"
  | "box"
  | "list"
  | "cashbox"
  | "ledger"
  | "trophy"
  | "split"
  | "truck"
  | "receipt"
  | "gear"
  | "menu"
  | "close"
  | "chevron-right";

function Icon({ children, size = 15 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const ICONS: Record<NavIconName, React.ReactNode> = {
  home: <path d="M3 8.5 10 3l7 5.5V16a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1z" />,
  cart: (
    <>
      <circle cx="8" cy="17" r="1.3" />
      <circle cx="15" cy="17" r="1.3" />
      <path d="M2 3h2l2 9h10l2-6H6" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="6" height="6" />
      <rect x="11" y="3" width="6" height="6" />
      <rect x="3" y="11" width="6" height="6" />
      <rect x="11" y="11" width="6" height="6" />
    </>
  ),
  document: (
    <>
      <path d="M5 2h7l3 3v13H5z" />
      <path d="M7.5 9h5M7.5 12.5h5" />
    </>
  ),
  users: (
    <>
      <circle cx="8" cy="7" r="3" />
      <path d="M2.5 17c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M14 5.5a2.5 2.5 0 0 1 0 5" />
    </>
  ),
  box: (
    <>
      <path d="M10 2.5 17.5 6v8L10 17.5 2.5 14V6z" />
      <path d="M2.5 6 10 9.5 17.5 6M10 9.5v8" />
    </>
  ),
  list: <path d="M3 5h14M3 10h14M3 15h9" />,
  cashbox: (
    <>
      <rect x="2.5" y="5" width="15" height="10" />
      <circle cx="10" cy="10" r="2" />
    </>
  ),
  ledger: <path d="M3 4h6v13H3zM11 4h6v13h-6z" />,
  trophy: (
    <>
      <path d="M6 3h8v4a4 4 0 0 1-8 0z" />
      <path d="M10 11v4M7 17h6" />
    </>
  ),
  split: <path d="M10 3v14M6.5 6.5h5a2 2 0 0 1 0 4h-3a2 2 0 0 0 0 4h5" />,
  truck: (
    <>
      <path d="M2 5h8v8H2z" />
      <path d="M10 8.5h3.5L16 11v2h-2.5" />
      <circle cx="5.5" cy="15.5" r="1.5" />
      <circle cx="13.5" cy="15.5" r="1.5" />
    </>
  ),
  receipt: (
    <>
      <path d="M5 2h10v15l-1.7-1.3L12 17l-1.7-1.3L9 17l-1.7-1.3L6 17l-1-1.3z" />
      <path d="M7.5 6h5M7.5 9.5h5" />
    </>
  ),
  gear: (
    <>
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 3v2M10 15v2M3 10h2M15 10h2M5 5l1.5 1.5M13.5 13.5 15 15M15 5l-1.5 1.5M6.5 13.5 5 15" />
    </>
  ),
  // Mobile bottom tab bar's "Menu" tab — matches the "7g" mockup's hamburger
  // exactly (3 equal lines, unlike "list"'s shorter third line).
  menu: <path d="M3 6h14M3 10h14M3 14h14" />,
  close: <path d="M5 5l10 10M15 5 5 15" />,
  "chevron-right": <path d="M7 4.5 12.5 10 7 15.5" />,
};

export default function NavIcon({ name, size }: { name: NavIconName; size?: number }) {
  return <Icon size={size}>{ICONS[name]}</Icon>;
}
