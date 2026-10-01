"use client";

import type { InputHTMLAttributes } from "react";

/** Small presentational pieces shared by the Payroll screens (Komisi, Gaji, Karyawan, Absensi, Riwayat). */

export function initials(nama: string): string {
  return (
    nama
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function Avatar({ nama, className = "" }: { nama: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface font-sans text-[12.5px] font-extrabold text-muted ${className}`}
    >
      {initials(nama)}
    </span>
  );
}

/** Rounded checkbox: yellow when checked, green + locked once already paid. */
export function PayCheckbox({ className = "", ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <label className={`relative block h-6 w-6 shrink-0 cursor-pointer ${className}`}>
      <input
        {...props}
        type="checkbox"
        className="peer absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      <span className="grid h-6 w-6 place-items-center rounded-lg border-[1.5px] border-line bg-panel text-transparent transition peer-checked:border-accent peer-checked:bg-accent peer-checked:text-ink peer-disabled:peer-checked:border-[#d7f2e6] peer-disabled:peer-checked:bg-[#d7f2e6] peer-disabled:peer-checked:text-[#087a52] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 10.5 8 14.5 16 6" />
        </svg>
      </span>
    </label>
  );
}

/** On/off switch (Aktif, Hadir). Green when on. */
export function PaySwitch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-[46px] shrink-0 cursor-pointer rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-[#087a52]" : "bg-line"
      }`}
    >
      <span
        className={`absolute left-[3px] top-[3px] h-[22px] w-[22px] rounded-full bg-panel shadow transition-transform ${
          checked ? "translate-x-[18px]" : ""
        }`}
      />
    </button>
  );
}

export type StatusTone = "ok" | "warn" | "tag";

const TONE: Record<StatusTone, string> = {
  ok: "bg-[#d7f2e6] text-[#087a52]",
  warn: "bg-accent-100 text-accent-700",
  tag: "bg-surface text-muted",
};

export function StatusPill({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 font-sans text-[10.5px] font-extrabold ${TONE[tone]}`}>
      {children}
    </span>
  );
}

/** Secondary pill button used for row actions (Detail, Edit, Lihat bukti). */
export const chipCls =
  "cursor-pointer whitespace-nowrap rounded-full border border-line bg-transparent px-3 py-1 font-sans text-[0.72rem] font-bold text-ink no-underline transition hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export const heroCls = "rounded-2xl bg-linear-to-br from-accent-100 to-panel p-4 shadow-lg shadow-accent-700/15 md:p-5";
export const eyebrowCls = "font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-accent-700";
export const bigFigureCls = "mt-1 font-sans text-[clamp(1.9rem,8vw,2.5rem)] font-black leading-tight tracking-tight";
export const factCls = "inline-flex items-baseline gap-1.5 rounded-full bg-panel px-3 py-1 font-sans text-[12px] text-muted shadow-sm";
