"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import UploadBox from "@/components/ui/UploadBox";
import { rupiah, formatDateShort } from "@/lib/format";
import type { TagihanBerjalanRow } from "@/lib/purchasing";

/**
 * Batch tagihan payment sheet — design "6b": pick tagihan on the left, the
 * right panel writes out the cash impact (kas sekarang -> kas keluar -> kas
 * setelah bayar) and a sufficiency check against this period's still-unpaid
 * Payroll obligations, before the button is even pressable. Same
 * checkbox-batch shape as BayarKomisiSheet/GajiBulananSheet — dispatches to
 * the existing single-bill /api/purchase-bills/[id]/pay per selected row
 * (in parallel) rather than a new batch endpoint.
 */
export default function BayarTagihanSheet({
  rows,
  kasTersedia,
  gajiBelumDibayar,
  gajiPeriodeLabel,
}: {
  rows: TagihanBerjalanRow[];
  kasTersedia: number;
  gajiBelumDibayar: number;
  gajiPeriodeLabel: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(rows.map((r) => r.id)));
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [buktiUrl, setBuktiUrl] = useState("");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRows = rows.filter((r) => selected.has(r.id));
  const total = selectedRows.reduce((s, r) => s + r.totalTagihan, 0);
  const totalHutang = rows.reduce((s, r) => s + r.totalTagihan, 0);
  const kasSetelahBayar = kasTersedia - total;
  const kasSetelahGaji = kasSetelahBayar - gajiBelumDibayar;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handlePay() {
    setError(null);
    if (selectedRows.length === 0) {
      setError("Pilih minimal 1 tagihan.");
      return;
    }
    setSaving(true);
    try {
      const results = await Promise.all(
        selectedRows.map((r) =>
          fetch(`/api/purchase-bills/${r.id}/pay`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tanggal, buktiUrl: buktiUrl || undefined, catatan: catatan || undefined }),
          })
        )
      );
      for (const res of results) {
        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          throw new Error(b.error || "Gagal membayar tagihan");
        }
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membayar tagihan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
      <div>
        <div className="flex items-center justify-between border-b-2 border-ink pb-2.5">
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
            Tagihan berjalan — urut jatuh tempo
          </span>
          <span className="font-mono text-[0.72rem] text-muted">
            {selectedRows.length} dari {rows.length} dipilih
          </span>
        </div>
        {rows.map((r) => {
          const checked = selected.has(r.id);
          const urgent = r.hariTerlambat > 0;
          return (
            <label
              key={r.id}
              className={`grid cursor-pointer grid-cols-[24px_1fr] items-start gap-x-3 gap-y-1.5 border-b border-line py-3.5 pl-3 text-[0.85rem] hover:bg-[#fbfaf5] sm:grid-cols-[24px_1fr_140px_150px] sm:items-center sm:gap-4 ${
                urgent ? "border-l-4 border-l-accent" : "border-l-4 border-l-line"
              }`}
            >
              <input type="checkbox" checked={checked} onChange={() => toggle(r.id)} className="mt-0.5 h-4 w-4 accent-accent sm:mt-0" />
              <span>
                <span className="block font-bold">{r.supplier}</span>
                <span className="mt-0.5 block font-mono text-[0.72rem] text-muted">
                  {r.nomor} · {r.namaBarang}
                </span>
              </span>
              <span className={`col-start-2 font-mono text-[0.72rem] font-bold sm:col-auto ${urgent ? "text-accent-700" : "text-muted"}`}>
                {urgent
                  ? `Telat ${r.hariTerlambat} hari`
                  : r.jatuhTempo
                    ? r.hariMenujuJatuhTempo === 0
                      ? "Jatuh tempo hari ini"
                      : r.hariMenujuJatuhTempo === 1
                        ? "Jatuh tempo besok"
                        : `${formatDateShort(r.jatuhTempo)} · ${r.hariMenujuJatuhTempo} hari`
                    : "Belum ada jatuh tempo"}
              </span>
              <span className="col-start-2 font-sans text-[0.95rem] font-extrabold sm:col-auto sm:text-right">
                {rupiah(r.totalTagihan)}
              </span>
            </label>
          );
        })}
        {rows.length === 0 && (
          <div className="border-b border-line py-10 text-center font-mono text-sm text-muted">
            Semua tagihan sudah dibayar. 🎉
          </div>
        )}

        <div className="mt-5 border-t-2 border-ink pt-3.5 font-mono text-[0.72rem] text-muted">
          Tagihan supplier muncul sendiri dari PO yang barangnya sudah diterima di{" "}
          <a href="/purchasing" className="text-accent-700 underline underline-offset-2">
            Purchasing
          </a>
          . Pembayaran langsung tercatat sebagai kas keluar di{" "}
          <a href="/keuangan" className="text-accent-700 underline underline-offset-2">
            Keuangan
          </a>
          .
        </div>
      </div>

      <div className="flex flex-col border-l-2 border-ink pl-6">
        <div className="border-b-2 border-ink pb-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
          Yang akan dibayar
        </div>
        <div className="mt-3.5 font-mono text-[0.78rem] text-muted">{selectedRows.length} tagihan terpilih</div>
        <div className="mt-1.5 font-sans text-[1.9rem] font-extrabold tracking-tight">{rupiah(total)}</div>

        <div className="mt-4 border-t border-line">
          <div className="flex justify-between border-b border-line py-2.5 font-mono text-[0.78rem]">
            <span className="text-muted">Kas sekarang</span>
            <b>{rupiah(kasTersedia)}</b>
          </div>
          <div className="flex justify-between border-b border-line py-2.5 font-mono text-[0.78rem]">
            <span className="text-muted">Kas keluar</span>
            <b className="text-accent-700">− {rupiah(total)}</b>
          </div>
          <div className="flex justify-between border-b-2 border-ink py-3 font-sans text-[0.85rem]">
            <span className="font-bold">Kas setelah bayar</span>
            <b className="text-[1.05rem]">{rupiah(kasSetelahBayar)}</b>
          </div>
          <div className="flex justify-between py-2.5 font-mono text-[0.78rem]">
            <span className="text-muted">Sisa hutang</span>
            <b>{rupiah(totalHutang - total)}</b>
          </div>
        </div>

        {gajiBelumDibayar > 0 && (
          <div
            className={`mt-4 border-l-4 py-2.5 pl-3 font-sans text-[0.78rem] leading-relaxed ${
              kasSetelahGaji >= 0 ? "border-ink text-ink/70" : "border-accent text-accent-700"
            }`}
          >
            {kasSetelahGaji >= 0
              ? `Setelah ini kas masih cukup untuk Payroll ${gajiPeriodeLabel} (${rupiah(gajiBelumDibayar)}) dengan sisa ${rupiah(kasSetelahGaji)}.`
              : `Perhatian — setelah bayar tagihan ini, kas TIDAK cukup untuk Payroll ${gajiPeriodeLabel} (${rupiah(gajiBelumDibayar)} masih belum dibayar). Kurang ${rupiah(Math.abs(kasSetelahGaji))}.`}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3">
          <Field label="Tanggal Pembayaran">
            <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </Field>
          <Field label="Bukti Transfer (opsional)">
            <UploadBox folder="purchasing" value={buktiUrl} onChange={setBuktiUrl} />
          </Field>
          <Field label="Catatan (opsional)">
            <Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          </Field>
        </div>

        {error && <div className="mt-3 font-mono text-[0.75rem] text-danger">{error}</div>}

        <Button onClick={handlePay} disabled={saving || selectedRows.length === 0} className="mt-4 justify-center">
          {saving ? "Memproses..." : `Bayar ${selectedRows.length} tagihan`}
        </Button>
      </div>
    </div>
  );
}
