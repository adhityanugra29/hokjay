"use client";

import { useMemo, useState } from "react";
import { Panel, PanelHead, SearchInput, TableScroll } from "@/components/ui/Panel";
import { Select } from "@/components/ui/Form";
import Pill from "@/components/ui/Pill";
import { rupiah, formatDateShort } from "@/lib/format";

export interface RiwayatInvoiceRow {
  invoiceId: string;
  nomor: string;
  customerNama: string;
  tanggalLunas: string;
  komisi: number;
}

export interface RiwayatRow {
  key: string;
  tipe: "gaji-sales" | "gaji-karyawan" | "komisi";
  nama: string;
  periode: string;
  total: number;
  tanggalBayar: string;
  dibayarOleh?: string;
  buktiUrl?: string;
  /** Komisi rows only. */
  invoices?: RiwayatInvoiceRow[];
}

const TIPE_LABEL: Record<RiwayatRow["tipe"], string> = {
  "gaji-sales": "Gaji Sales",
  "gaji-karyawan": "Gaji Karyawan",
  komisi: "Komisi",
};

function periodeLabel(periode: string): string {
  const [y, m] = periode.split("-").map(Number);
  if (!y || !m) return periode;
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "short", year: "numeric" });
}

/** Table + search/tipe/periode filter + Detail drawer for Komisi rows — powers /payroll/riwayat. Search/filter run client-side over the full fetched list (same size class as other admin history views, no pagination needed yet). */
export default function RiwayatPembayaranClient({ rows }: { rows: RiwayatRow[] }) {
  const [search, setSearch] = useState("");
  const [tipe, setTipe] = useState<"semua" | RiwayatRow["tipe"]>("semua");
  const [periode, setPeriode] = useState("semua");
  const [detailKey, setDetailKey] = useState<string | null>(null);

  const periodeOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.periode));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [rows]);

  const filtered = rows.filter((r) => {
    if (search && !r.nama.toLowerCase().includes(search.toLowerCase())) return false;
    if (tipe !== "semua" && r.tipe !== tipe) return false;
    if (periode !== "semua" && r.periode !== periode) return false;
    return true;
  });

  const detailRow = rows.find((r) => r.key === detailKey) ?? null;

  return (
    <Panel>
      <PanelHead title="Riwayat Pembayaran">
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama..."
          />
          <Select value={tipe} onChange={(e) => setTipe(e.target.value as typeof tipe)} className="!w-auto !py-2 !text-[0.78rem]">
            <option value="semua">Semua Tipe</option>
            <option value="gaji-sales">Gaji Sales</option>
            <option value="gaji-karyawan">Gaji Karyawan</option>
            <option value="komisi">Komisi</option>
          </Select>
          <Select value={periode} onChange={(e) => setPeriode(e.target.value)} className="!w-auto !py-2 !text-[0.78rem]">
            <option value="semua">Semua Periode</option>
            {periodeOptions.map((p) => (
              <option key={p} value={p}>
                {periodeLabel(p)}
              </option>
            ))}
          </Select>
        </div>
      </PanelHead>
      <TableScroll>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["Nama", "Tipe", "Periode", "Total", "Tanggal Bayar", "Dibayar Oleh", "Bukti Transfer", "Detail"].map(
                (h, i) => (
                  <th
                    key={h}
                    className={`border-b border-line px-5 py-3 text-left font-mono text-[0.68rem] uppercase tracking-wide text-muted ${
                      i === 3 ? "text-right" : ""
                    }`}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.key} className="transition hover:bg-surface">
                <td className="border-b border-line px-5 py-4.5 font-semibold">{r.nama}</td>
                <td className="border-b border-line px-5 py-4.5">
                  <Pill variant={r.tipe === "komisi" ? "komisi" : "gaji"}>{TIPE_LABEL[r.tipe]}</Pill>
                </td>
                <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{periodeLabel(r.periode)}</td>
                <td className="border-b border-line px-5 py-4.5 text-right font-mono text-[0.8rem]">{rupiah(r.total)}</td>
                <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{formatDateShort(r.tanggalBayar)}</td>
                <td className="border-b border-line px-5 py-4.5">{r.dibayarOleh ?? "—"}</td>
                <td className="border-b border-line px-5 py-4.5">
                  {r.buktiUrl ? (
                    <a href={r.buktiUrl} target="_blank" rel="noreferrer" className="text-[0.78rem] text-accent-700 underline">
                      Lihat bukti
                    </a>
                  ) : (
                    <span className="text-[0.78rem] text-muted">—</span>
                  )}
                </td>
                <td className="border-b border-line px-5 py-4.5">
                  {r.invoices && r.invoices.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setDetailKey(r.key)}
                      className="cursor-pointer text-[0.78rem] font-semibold text-accent-700 underline"
                    >
                      {r.invoices.length} invoice &rsaquo;
                    </button>
                  ) : (
                    <span className="text-[0.78rem] text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center font-mono text-sm text-muted">
                  Belum ada riwayat pembayaran.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>

      {detailRow && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/50"
          onClick={() => setDetailKey(null)}
        >
          <div
            className="flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-panel shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line bg-surface px-5 py-4">
              <div>
                <div className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-muted">Detail Invoice</div>
                <h2 className="font-sans text-[1rem] font-extrabold text-ink">
                  {detailRow.nama}
                  <span className="ml-2 font-mono text-[0.72rem] font-normal text-muted">
                    ({detailRow.invoices?.length ?? 0} invoice)
                  </span>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailKey(null)}
                aria-label="Tutup"
                className="flex h-9 w-9 cursor-pointer items-center justify-center border border-line text-lg text-ink hover:border-accent hover:text-accent-700"
              >
                &#10005;
              </button>
            </div>
            <div className="flex flex-col gap-3 p-5">
              <div className="font-mono text-[0.72rem] text-muted">
                Dibayar {formatDateShort(detailRow.tanggalBayar)} — komisi dicairkan bersamaan untuk invoice berikut.
              </div>
              <TableScroll>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {["Nomor", "Customer", "Tgl Lunas", "Komisi"].map((h, i) => (
                        <th
                          key={h}
                          className={`border-b border-line px-4 py-2.5 text-left font-mono text-[0.66rem] uppercase tracking-wide text-muted ${
                            i === 3 ? "text-right" : ""
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detailRow.invoices?.map((inv) => (
                      <tr key={inv.invoiceId}>
                        <td className="border-b border-line px-4 py-3 font-mono text-[0.78rem] font-semibold">{inv.nomor}</td>
                        <td className="border-b border-line px-4 py-3">{inv.customerNama}</td>
                        <td className="border-b border-line px-4 py-3 font-mono text-[0.78rem]">
                          {formatDateShort(inv.tanggalLunas)}
                        </td>
                        <td className="border-b border-line px-4 py-3 text-right font-mono text-[0.78rem]">
                          {rupiah(inv.komisi)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
              <div className="flex justify-between border-t border-line px-1 py-2.5 text-[0.85rem] font-bold">
                <span>Total Komisi</span>
                <span>{rupiah(detailRow.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
