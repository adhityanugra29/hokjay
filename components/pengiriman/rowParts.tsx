"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDialog } from "@/components/ui/Dialog";
import { formatDateShort } from "@/lib/format";
import type { PengirimanSentRow, PengirimanTodoRow } from "@/lib/pengiriman";

// Pieces shared by the Perlu Dikirim / Sudah Dikirim lists of PengirimanClient.tsx (moved here unchanged).

export const TONE_CLS: Record<PengirimanTodoRow["tone"], string> = {
  overdue: "text-red-600",
  today: "text-accent-700",
  soon: "text-ink",
  later: "text-ink",
  none: "text-muted",
};

export const GRID_TODO =
  "xl:grid-cols-[110px_minmax(0,1.6fr)_minmax(0,1fr)_72px_92px_minmax(0,160px)_32px]";
export const GRID_SENT = "xl:grid-cols-[92px_minmax(0,1.5fr)_minmax(0,1fr)_76px_76px_96px_88px_112px]";

// Same look as the dark "Tandai Sudah Kirim" button on the invoice detail page (rounded-lg, ink fill, accent text), sized for a table row.
export const PRIMARY_CLS =
  "inline-flex cursor-pointer items-center justify-center rounded-lg border border-ink bg-ink px-3.5 py-2 font-sans text-[0.78rem] font-extrabold text-accent transition hover:bg-ink/85";

export const th = "font-sans text-[0.66rem] font-bold uppercase tracking-wider text-muted";
export const fmt = (iso?: string) => (iso ? formatDateShort(iso) : "-");

export type SuratJalanTarget = { invoiceId: string; nomor: string; customerNama: string };

export function Kebab({
  open,
  onToggle,
  up,
  children,
  label,
}: {
  open: boolean;
  onToggle: () => void;
  up: boolean;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <span className="relative inline-flex justify-end">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-0 text-ink hover:bg-black/10 ${
          open ? "bg-black/10" : "bg-transparent"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-0 z-20 flex min-w-[180px] flex-col rounded-xl border border-line bg-panel p-1.5 shadow-lg ${
            up ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"
          }`}
        >
          {children}
        </div>
      )}
    </span>
  );
}

export const menuItemCls =
  "cursor-pointer rounded-lg border-0 bg-transparent px-3 py-2 text-left font-sans text-[0.8rem] font-bold text-ink no-underline hover:bg-accent-100";

export function BatalkanButton({ row, className }: { row: PengirimanSentRow; className?: string }) {
  const router = useRouter();
  const { confirm, alert } = useDialog();
  const [busy, setBusy] = useState(false);

  async function handle() {
    const ok = await confirm(
      `Batalkan pengiriman ${row.nomor}? Invoice kembali ke daftar Perlu Dikirim dan No. Resi dihapus.`,
      { title: "Batalkan pengiriman", confirmLabel: "Batalkan", danger: true }
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/invoices/${row.invoiceId}/kirim`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dikirim: false }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal membatalkan pengiriman");
      }
      router.refresh();
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Gagal membatalkan pengiriman");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      className={`cursor-pointer rounded-lg border border-line bg-transparent px-3.5 py-2 font-sans text-[0.78rem] font-extrabold text-danger hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 ${
        className ?? ""
      }`}
    >
      {busy ? "Membatalkan..." : "Batalkan"}
    </button>
  );
}

export function SuratJalanButton({
  row,
  onOpen,
  className,
}: {
  row: PengirimanSentRow;
  onOpen: (v: { invoiceId: string; nomor: string; customerNama: string }) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen({ invoiceId: row.invoiceId, nomor: row.nomor, customerNama: row.customerNama })}
      className={`cursor-pointer whitespace-nowrap rounded-lg border border-line bg-transparent px-2.5 py-2 font-sans text-[0.78rem] font-extrabold text-ink hover:bg-black/5 ${className ?? ""}`}
    >
      Surat Jalan
    </button>
  );
}

export function Detail({ alamat, catatan }: { alamat?: string; catatan?: string }) {
  return (
    <dl className="m-0 grid grid-cols-1 gap-3 bg-[#fbf8ef] px-5 pt-1 pb-4 text-[0.8rem] md:grid-cols-2">
      <div>
        <dt className={th}>Alamat kirim</dt>
        <dd className="m-0 mt-0.5">{alamat || <span className="text-muted">Belum diisi</span>}</dd>
      </div>
      <div>
        <dt className={th}>Catatan</dt>
        <dd className="m-0 mt-0.5">{catatan || <span className="text-muted">Tidak ada</span>}</dd>
      </div>
    </dl>
  );
}
