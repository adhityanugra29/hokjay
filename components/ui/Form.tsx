import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

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

const inputCls =
  "w-full rounded-[3px] border border-line bg-paper px-3.5 py-2.5 font-sans text-[0.9rem] text-ink placeholder:text-muted outline-offset-1 focus:outline-2 focus:outline-moss disabled:cursor-not-allowed disabled:bg-[#efece3] disabled:text-muted";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function FormActions({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex flex-wrap gap-2.5">{children}</div>;
}
