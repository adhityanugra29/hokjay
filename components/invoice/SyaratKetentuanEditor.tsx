"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { SK_MAX_POIN, SK_MAX_CHARS_PER_POIN, SK_MAX_CHARS_TOTAL } from "@/lib/syaratKetentuan";

/**
 * Per-invoice Syarat & Ketentuan, at the very bottom of the invoice form —
 * per the user's request 2026-10-12. Starts collapsed (one summary line) so
 * the form doesn't grow on a phone; opening it shows one box per numbered
 * point, same shape as Admin → Invoice's template editor.
 *
 * Edits here only ever change THIS invoice — the Admin → Invoice template is
 * never touched. `isDefault` is computed by the parent (text still equals
 * the template); `frozen` means the invoice has already been sent, so it no
 * longer follows the template and the summary says so.
 */
export default function SyaratKetentuanEditor({
  lines,
  onChange,
  templateLines,
  isDefault,
  frozen,
}: {
  lines: string[];
  onChange: (lines: string[]) => void;
  templateLines: string[];
  isDefault: boolean;
  frozen: boolean;
}) {
  const [open, setOpen] = useState(false);
  const count = lines.filter((l) => l.trim()).length;
  const totalChars = lines.reduce((n, l) => n + l.trim().length, 0);

  const title = isDefault
    ? frozen
      ? "Sama dengan template"
      : "Ikut template default"
    : "Custom untuk invoice ini";
  const desc =
    count === 0
      ? "Tanpa Syarat & Ketentuan — blok tidak ditampilkan di invoice"
      : `${count} poin · ditampilkan di invoice`;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-line bg-paper px-3.5 py-3 text-left hover:border-accent-600"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-sans text-[0.9rem] font-extrabold">{title}</span>
          <span className="block font-sans text-[0.78rem] text-muted">{desc}</span>
        </span>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 font-sans text-[0.68rem] font-bold ${
            isDefault ? "border-line text-muted" : "border-accent-700 bg-accent-100 text-accent-700"
          }`}
        >
          {isDefault ? "Default" : "Custom"}
        </span>
        <span className="shrink-0 font-mono text-[0.75rem] text-muted">{open ? "Tutup ▴" : "Ubah ▾"}</span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2">
          {lines.map((line, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="w-7 shrink-0 pt-2.5 text-right font-mono text-[0.75rem] text-muted">{idx + 1}.</span>
              <div className="min-w-0 flex-1">
                <Textarea
                  noUppercase
                  rows={2}
                  maxLength={Math.min(SK_MAX_CHARS_PER_POIN, line.length + Math.max(0, SK_MAX_CHARS_TOTAL - totalChars))}
                  value={line}
                  onChange={(e) => onChange(lines.map((l, i) => (i === idx ? e.target.value : l)))}
                />
              </div>
              <button
                type="button"
                onClick={() => onChange(lines.filter((_, i) => i !== idx))}
                className="shrink-0 cursor-pointer px-1 pt-2.5 font-mono text-[0.72rem] text-danger"
              >
                Hapus
              </button>
            </div>
          ))}

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={lines.length >= SK_MAX_POIN}
              onClick={() => onChange([...lines, ""])}
              className="cursor-pointer rounded-[10px] border-[1.5px] border-dashed border-line px-3.5 py-2 font-sans text-[0.82rem] text-muted hover:border-accent-700 hover:text-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Tambah poin
            </button>
            <span className="flex-1" />
            <Button type="button" variant="ghost" disabled={isDefault} onClick={() => onChange(templateLines)}>
              Kembalikan ke default
            </Button>
          </div>
          <p className="font-mono text-[0.7rem] text-muted">
            Perubahan di sini hanya berlaku untuk invoice ini; template diatur di Admin → Invoice. Maksimal{" "}
            {SK_MAX_POIN} poin, {SK_MAX_CHARS_PER_POIN} karakter per poin, total {SK_MAX_CHARS_TOTAL} karakter agar
            muat di PDF ({totalChars}/{SK_MAX_CHARS_TOTAL} terpakai).
          </p>
        </div>
      )}
    </div>
  );
}
