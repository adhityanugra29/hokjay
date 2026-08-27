"use client";

import { createContext, useCallback, useContext, useState } from "react";

/**
 * Custom alert()/confirm() replacement — the browser's native versions
 * look jarring against this app's own design and can't be styled or
 * positioned consistently. Per the user's request 2026-08-28 ("tolong
 * tampilkan di layar seperti 'mohon menunggu' bukan lewat browser"),
 * matching the visual language of LoadingOverlay.tsx's own overlay.
 *
 * Both return a Promise so call sites that used to do
 * `if (!confirm(...)) return;` become `if (!(await confirm(...))) return;`
 * — the only real shape change needed at each site.
 */

interface DialogState {
  type: "alert" | "confirm";
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Confirm button reads as destructive (red) instead of the usual accent — for delete/discard actions. */
  danger?: boolean;
  resolve: (value: boolean) => void;
}

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface DialogContextValue {
  alert: (message: string, opts?: { title?: string }) => Promise<void>;
  confirm: (message: string, opts?: ConfirmOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const alertFn = useCallback((message: string, opts?: { title?: string }) => {
    return new Promise<void>((resolve) => {
      setDialog({ type: "alert", message, title: opts?.title, resolve: () => resolve() });
    });
  }, []);

  const confirmFn = useCallback((message: string, opts?: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        type: "confirm",
        message,
        title: opts?.title,
        confirmLabel: opts?.confirmLabel,
        cancelLabel: opts?.cancelLabel,
        danger: opts?.danger,
        resolve,
      });
    });
  }, []);

  function close(result: boolean) {
    dialog?.resolve(result);
    setDialog(null);
  }

  return (
    <DialogContext.Provider value={{ alert: alertFn, confirm: confirmFn }}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
          onClick={() => dialog.type === "alert" && close(false)}
        >
          <div
            className="w-full max-w-sm border-2 border-ink bg-panel p-6 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            {dialog.title && <h3 className="mb-2 font-sans text-[1rem] font-extrabold text-ink">{dialog.title}</h3>}
            <p className="whitespace-pre-line font-sans text-[0.88rem] leading-relaxed text-ink">{dialog.message}</p>
            <div className="mt-5 flex justify-end gap-2.5">
              {dialog.type === "confirm" && (
                <button
                  type="button"
                  onClick={() => close(false)}
                  className="cursor-pointer border border-line px-4 py-2 font-sans text-[0.82rem] font-semibold text-ink hover:bg-black/5"
                >
                  {dialog.cancelLabel ?? "Batal"}
                </button>
              )}
              <button
                type="button"
                onClick={() => close(true)}
                autoFocus
                className={`cursor-pointer border px-4 py-2 font-sans text-[0.82rem] font-semibold text-white ${
                  dialog.danger ? "border-danger bg-danger" : "border-accent bg-accent"
                }`}
              >
                {dialog.type === "confirm" ? (dialog.confirmLabel ?? "Ya") : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within DialogProvider");
  return ctx;
}
