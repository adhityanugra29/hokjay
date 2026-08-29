import { forwardRef, useEffect, useState, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

export function FormGrid({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`grid grid-cols-1 gap-4.5 sm:grid-cols-2 ${className}`}>{children}</div>;
}

export function Field({
  label,
  hint,
  span2,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  span2?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${span2 ? "sm:col-span-2" : ""}`}>
      <label className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">{label}</label>
      {children}
      {hint && <div className="font-mono text-[0.68rem] text-muted">{hint}</div>}
    </div>
  );
}

export const inputCls =
  "w-full rounded-[3px] border border-line bg-paper px-3.5 py-2.5 font-sans text-[0.9rem] text-ink placeholder:text-muted outline-offset-1 focus:outline-2 focus:outline-moss disabled:cursor-not-allowed disabled:bg-[#efece3] disabled:text-muted";

// forwardRef so callers that need to move focus programmatically (e.g. the
// Ukuran P x L x T auto-advance fields) can attach a ref — every existing
// non-ref usage is unaffected.
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(props, ref) {
  return <input {...props} ref={ref} className={`${inputCls} ${props.className ?? ""}`} />;
});

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function FormActions({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex flex-wrap gap-2.5">{children}</div>;
}

function formatRibuan(digits: string): string {
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

/**
 * Number input formatted with thousand separators while typing (Indonesian
 * accounting style — "1.000.000") — per the user's request 2026-08-25.
 * `value`/`onChange` still carry the plain digit string ("1000000"), same
 * shape as every other price field in this app's forms; only the on-screen
 * display is formatted. type="text" (not "number") since browsers strip
 * non-digit formatting from number inputs — inputMode="numeric" keeps the
 * numeric keyboard on mobile.
 */
export function CurrencyInput({
  value,
  onChange,
  onBlur,
  placeholder,
  required,
  className = "",
  showPrefix = false,
}: {
  value: string;
  onChange: (raw: string) => void;
  /** Fires on blur with the raw digits, after the field's own internal
   * "keep showing what was typed while focused" state is done with it —
   * for validation that shouldn't run mid-keystroke (e.g. Katalog's
   * below-minimum-price check, which needs the user's final number, not
   * every partially-typed digit). Per the user's request 2026-08-29. */
  onBlur?: (raw: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  /** Shows a visual "Rp" prefix inside the field — opt-in (default off, so
   * every other existing CurrencyInput usage keeps its current look) since
   * this was requested specifically for Katalog's price field, where users
   * were reading the plain typed number as something other than a price.
   * See confirmation 2026-08-26. */
  showPrefix?: boolean;
}) {
  const [raw, setRaw] = useState(value);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setRaw(value);
  }, [value, focused]);

  const input = (
    <input
      type="text"
      inputMode="numeric"
      required={required}
      value={formatRibuan(raw)}
      onFocus={(e) => {
        setFocused(true);
        // Select-all on focus — otherwise typing into an already-filled
        // field (e.g. Katalog's per-item price, prefilled with the global
        // Rekomendasi/Minimum value) just concatenates digits into the
        // existing number instead of replacing it, which made a custom
        // price effectively impossible to type cleanly. Per the user's
        // report 2026-08-25.
        e.target.select();
      }}
      onBlur={() => {
        setFocused(false);
        onBlur?.(raw);
      }}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "");
        setRaw(digits);
        onChange(digits);
      }}
      placeholder={placeholder}
      className={`${inputCls} ${showPrefix ? "pl-9" : ""} ${className}`}
    />
  );

  if (!showPrefix) return input;

  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-sans text-[0.9rem] text-muted">
        Rp
      </span>
      {input}
    </div>
  );
}
