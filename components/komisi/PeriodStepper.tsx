import Link from "next/link";
import { MONTH_NAMES } from "@/lib/constants";

const MAX_MONTHS_BACK = 24;

function href(year: number, month: number, current: { year: number; month: number }): string {
  if (year === current.year && month === current.month) return "/komisi-saya";
  return `/komisi-saya?bulan=${month}&tahun=${year}`;
}

/**
 * ‹ Oktober 2026 › month stepper for Komisi Saya. Plain links (no client JS):
 * each arrow is a real URL (?bulan=&tahun=, the same params PeriodPicker uses
 * elsewhere), so back/forward and sharing the link keep working. The next
 * arrow stops at the running month; the prev arrow stops MAX_MONTHS_BACK
 * months back.
 */
export default function PeriodStepper({
  year,
  month,
  current,
}: {
  year: number;
  month: number;
  current: { year: number; month: number };
}) {
  const index = year * 12 + (month - 1);
  const currentIndex = current.year * 12 + (current.month - 1);
  const prev = index - 1;
  const next = index + 1;
  const canPrev = currentIndex - prev <= MAX_MONTHS_BACK;
  const canNext = next <= currentIndex;
  const isCurrent = index === currentIndex;

  const arrow =
    "flex h-9 w-9 items-center justify-center rounded-full text-ink no-underline transition hover:bg-surface";
  const disabledArrow = "flex h-9 w-9 items-center justify-center rounded-full text-ink opacity-30";

  return (
    <nav aria-label="Periode komisi" className="inline-flex items-center rounded-full bg-panel p-[3px] shadow-sm">
      {canPrev ? (
        <Link
          href={href(Math.floor(prev / 12), (prev % 12) + 1, current)}
          className={arrow}
          aria-label="Bulan sebelumnya"
        >
          <Chevron dir="left" />
        </Link>
      ) : (
        <span className={disabledArrow} aria-hidden="true">
          <Chevron dir="left" />
        </span>
      )}
      <div className="min-w-[132px] text-center font-sans text-[0.86rem] font-extrabold leading-[1.15]">
        {MONTH_NAMES[month - 1]} {year}
        {isCurrent && (
          <small className="block text-[10px] font-bold uppercase tracking-[0.06em] text-accent-700">Berjalan</small>
        )}
      </div>
      {canNext ? (
        <Link
          href={href(Math.floor(next / 12), (next % 12) + 1, current)}
          className={arrow}
          aria-label="Bulan berikutnya"
        >
          <Chevron dir="right" />
        </Link>
      ) : (
        <span className={disabledArrow} aria-hidden="true">
          <Chevron dir="right" />
        </span>
      )}
    </nav>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === "left" ? "M12.5 4.5 7 10l5.5 5.5" : "M7.5 4.5 13 10l-5.5 5.5"} />
    </svg>
  );
}
