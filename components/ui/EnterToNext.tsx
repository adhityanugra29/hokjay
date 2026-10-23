"use client";

import { useEffect } from "react";

// Ponsel/tablet tidak punya tombol Tab: keyboard virtual hanya punya
// "Next"/"Enter". Pasang satu listener global agar Enter pada input satu baris
// di dalam <form> memindahkan fokus ke kolom berikutnya (seperti Tab di
// desktop). Di kolom terakhir Enter tetap submit seperti biasa.
const SKIP_TYPES = new Set(["checkbox", "radio", "file", "button", "submit", "reset", "hidden", "image", "range", "color"]);
const FIELD_SELECTOR = "input, select, textarea";

function isFocusable(el: HTMLElement): boolean {
  if (el instanceof HTMLInputElement && SKIP_TYPES.has(el.type)) return false;
  if ((el as HTMLInputElement).disabled || (el as HTMLInputElement).readOnly) return false;
  if (el.tabIndex < 0) return false;
  return el.getClientRects().length > 0;
}

export default function EnterToNext() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Enter" || e.defaultPrevented || e.isComposing || e.shiftKey || e.ctrlKey || e.metaKey) return;
      const t = e.target;
      if (!(t instanceof HTMLInputElement) || SKIP_TYPES.has(t.type)) return;
      const form = t.form;
      if (!form) return;
      if (t.getAttribute("role") === "combobox" || t.getAttribute("aria-autocomplete")) return;
      const fields = Array.from(form.querySelectorAll<HTMLElement>(FIELD_SELECTOR)).filter(isFocusable);
      const next = fields[fields.indexOf(t) + 1];
      if (!next) return; // kolom terakhir → submit normal
      e.preventDefault();
      next.focus();
      if (next instanceof HTMLInputElement && ["text", "search", "tel", "url", "email", "number", "password"].includes(next.type)) {
        try {
          next.select();
        } catch {
          /* tipe tanpa selection API */
        }
      }
    }

    function onFocusIn(e: FocusEvent) {
      const t = e.target;
      if (t instanceof HTMLInputElement && t.form && !SKIP_TYPES.has(t.type) && !t.enterKeyHint) {
        const fields = Array.from(t.form.querySelectorAll<HTMLElement>(FIELD_SELECTOR)).filter(isFocusable);
        t.enterKeyHint = fields.indexOf(t) < fields.length - 1 ? "next" : "done";
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  return null;
}
