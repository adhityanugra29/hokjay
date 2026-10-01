"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Textarea } from "@/components/ui/Form";
import { Button, LinkButton } from "@/components/ui/Button";
import UploadBox from "@/components/ui/UploadBox";
import InvoicePdfModal from "@/components/invoice/InvoicePdfModal";
import { PayCheckbox } from "@/components/payroll/ui";
import { rupiah, formatDateShort } from "@/lib/format";
import type { UnpaidCommissionInvoice } from "@/lib/insentif";

const labelCls = "mb-1 block font-sans text-[11.5px] font-bold text-muted";

export default function KomisiPaymentForm({
  salesNama,
  invoices,
  onSuccess,
  onCancel,
}: {
  salesNama: string;
  invoices: UnpaidCommissionInvoice[];
  /** Defaults to navigating back to /payroll (the standalone /payroll/komisi/[nama] page's own usage). The Daftar Bayar pop-up (BayarKomisiSheet.tsx) passes its own so it just closes + refreshes in place instead of leaving the page. Per the user's request 2026-09-04. */
  onSuccess?: () => void;
  /** Defaults to a Link back to /payroll — the pop-up usage passes its own to just close. */
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(invoices.map((i) => i.invoiceId)));
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [buktiUrl, setBuktiUrl] = useState("");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which invoice's PDF preview is open — tapping an invoice number opens it
  // in place (InvoicePdfModal) instead of navigating away, so the checkbox
  // selection here isn't lost. Per the user's request 2026-10-01.
  const [pdfInvoice, setPdfInvoice] = useState<{ id: string; nomor: string } | null>(null);

  const total = useMemo(
    () => invoices.filter((i) => selected.has(i.invoiceId)).reduce((s, i) => s + i.komisiTotal, 0),
    [invoices, selected]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === invoices.length ? new Set() : new Set(invoices.map((i) => i.invoiceId))));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size === 0) {
      setError("Pilih minimal 1 invoice untuk dibayar.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/insentif/bayar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceIds: [...selected],
          tanggal,
          buktiUrl: buktiUrl || undefined,
          catatan: catatan || undefined,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || "Gagal memproses pembayaran komisi");
      }
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/payroll");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses pembayaran komisi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <section className="rounded-2xl bg-panel shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-1 pt-3.5">
          <h3 className="font-sans text-[0.95rem] font-extrabold">Invoice komisi belum cair</h3>
          <button
            type="button"
            onClick={toggleAll}
            className="cursor-pointer font-sans text-[0.75rem] font-bold text-accent-700 underline underline-offset-2"
          >
            {selected.size === invoices.length ? "Batal pilih semua" : "Pilih semua"}
          </button>
        </div>
        <div className="px-4 pb-2">
          {invoices.map((inv) => (
            <div
              key={inv.invoiceId}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-line py-3 first:border-t-0"
            >
              <PayCheckbox
                checked={selected.has(inv.invoiceId)}
                onChange={() => toggle(inv.invoiceId)}
                aria-label={`Pilih ${inv.nomor}`}
              />
              <div className="min-w-0">
                <div className="font-sans text-[0.88rem] font-bold wrap-anywhere">{inv.itemLabel}</div>
                <div className="font-sans text-[11px] text-muted">
                  <button
                    type="button"
                    onClick={() => setPdfInvoice({ id: inv.invoiceId, nomor: inv.nomor })}
                    aria-label={`Buka PDF invoice ${inv.nomor}`}
                    className="cursor-pointer font-mono font-bold text-accent-700 underline underline-offset-2"
                  >
                    {inv.nomor}
                  </button>{" "}
                  · lunas {formatDateShort(inv.tanggalLunas)}
                </div>
              </div>
              <div className="whitespace-nowrap font-sans text-[0.9rem] font-extrabold">{rupiah(inv.komisiTotal)}</div>
            </div>
          ))}
          {invoices.length === 0 && (
            <div className="py-6 text-center font-sans text-[0.85rem] text-muted">
              Tidak ada komisi belum cair untuk {salesNama}.
            </div>
          )}
        </div>
      </section>

      <section className="flex max-w-2xl flex-col gap-4 rounded-2xl bg-panel p-4 shadow-sm md:p-5">
        <div className="rounded-xl bg-ink px-4 py-4 text-white">
          <div className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
            Total dibayar ({selected.size} invoice)
          </div>
          <div className="mt-1 font-sans text-[1.6rem] font-extrabold tracking-tight">{rupiah(total)}</div>
        </div>

        <div>
          <label htmlFor="komisi-tanggal" className={labelCls}>
            Tanggal pembayaran
          </label>
          <Input id="komisi-tanggal" required type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </div>
        <div>
          <span className={labelCls}>Bukti transfer (opsional)</span>
          <UploadBox folder="komisi" value={buktiUrl} onChange={setBuktiUrl} />
        </div>
        <div>
          <label htmlFor="komisi-catatan" className={labelCls}>
            Catatan (opsional)
          </label>
          <Textarea
            id="komisi-catatan"
            rows={2}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Contoh: transfer BCA a.n. ..."
          />
        </div>

        {error && <div className="font-sans text-[0.78rem] text-danger">{error}</div>}

        <div className="flex flex-wrap gap-2.5">
          <Button type="submit" disabled={saving || selected.size === 0} className="!rounded-full">
            {saving ? "Memproses..." : `Bayar Komisi (${rupiah(total)})`}
          </Button>
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel} className="!rounded-full">
              Batal
            </Button>
          ) : (
            <LinkButton variant="ghost" href="/payroll" className="!rounded-full">
              Batal
            </LinkButton>
          )}
        </div>
      </section>

      {pdfInvoice && (
        <InvoicePdfModal invoiceId={pdfInvoice.id} nomor={pdfInvoice.nomor} onClose={() => setPdfInvoice(null)} />
      )}
    </form>
  );
}
