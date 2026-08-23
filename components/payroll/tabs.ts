/** Admin-only Payroll subnav — shared across app/payroll/**\/page.tsx (see SubnavTabs). */
export const PAYROLL_TABS = [
  { href: "/payroll", label: "Komisi" },
  // Gaji Sales Tetap + Gaji Karyawan merged into one tab per the user's
  // request 2026-08-24 ("fieldnya sama kok") — see getGajiBulananSummary.
  { href: "/payroll/gaji", label: "Gaji" },
  { href: "/payroll/karyawan", label: "Karyawan" },
  { href: "/payroll/absensi", label: "Absensi" },
];
