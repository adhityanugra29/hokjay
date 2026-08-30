"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input, Textarea } from "@/components/ui/Form";
import { Button, LinkButton } from "@/components/ui/Button";
import UploadBox from "@/components/ui/UploadBox";
import { rupiah, formatDateShort } from "@/lib/format";
import type { UnpaidCommissionInvoice } from "@/lib/insentif";

export default function KomisiPaymentForm({
  salesNama,
  invoices,
}: {
  salesNama: string;
  invoices: UnpaidCommissionInvoice[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(invoices.map((i) => i.invoiceId)));
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [buktiUrl, setBuktiUrl] = useState("");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      router.push("/payroll");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses pembayaran komisi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Panel className="mb-5">
        <PanelHead title={`Invoice komisi belum cair — ${salesNama}`}>
          <button
            type="button"
            onClick={toggleAll}
            className="cursor-pointer font-sans text-[0.75rem] text-accent-700 underline underline-offset-2"
          >
            {selected.size === invoices.length ? "Batal pilih semua" : "Pilih semua"}
          </button>
        </PanelHead>
        <TableScroll>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border-b border-line px-5 py-4" />
                <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                  No. Invoice
                </th>
                <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                  Tanggal Lunas
                </th>
                <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                  Item
                </th>
                <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                  Komisi
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.invoiceId} className="hover:bg-[#fbfaf5]">
                  <td className="border-b border-line px-5 py-4.5">
                    <input
                      type="checkbox"
                      checked={selected.has(inv.invoiceId)}
                      onChange={() => toggle(inv.invoiceId)}
                      className="h-4 w-4 accent-accent"
                    />
                  </td>
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{inv.nomor}</td>
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                    {formatDateShort(inv.tanggalLunas)}
                  </td>
                  <td className="border-b border-line px-5 py-4.5">{inv.itemLabel}</td>
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem] font-medium text-accent-700">
                    {rupiah(inv.komisiTotal)}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center font-mono text-sm text-muted">
                    Tidak ada komisi belum cair untuk sales ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableScroll>
      </Panel>

      <Panel className="max-w-2xl p-7">
        <div className="mb-5 border border-line bg-[#f7f5ee] p-5">
          <div className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">
            Total dibayar ({selected.size} invoice)
          </div>
          <div className="mt-1 text-[1.6rem] font-extrabold text-accent-700">{rupiah(total)}</div>
        </div>

        <FormGrid>
          <Field label="Tanggal Pembayaran">
            <Input required type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </Field>
          <Field label="Bukti Transfer (opsional)" span2>
            <UploadBox folder="komisi" value={buktiUrl} onChange={setBuktiUrl} />
          </Field>
          <Field label="Catatan (opsional)" span2>
            <Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Contoh: transfer BCA a.n. ..." />
          </Field>
        </FormGrid>

        {error && <div className="mt-3 font-mono text-[0.75rem] text-danger">{error}</div>}

        <FormActions>
          <Button type="submit" disabled={saving || selected.size === 0}>
            {saving ? "Memproses..." : `Bayar Komisi (${rupiah(total)})`}
          </Button>
          <LinkButton variant="ghost" href="/payroll">
            Batal
          </LinkButton>
        </FormActions>
      </Panel>
    </form>
  );
}
