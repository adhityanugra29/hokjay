"use client";

import FollowUpStatusBadge from "@/components/dashboard/FollowUpStatusBadge";
import type { PengirimanSentRow } from "@/lib/pengiriman";
import { BatalkanButton, GRID_SENT, SuratJalanButton, fmt, th, type SuratJalanTarget } from "./rowParts";

/** The "Sudah Dikirim" list (desktop table + mobile cards), moved out of PengirimanClient.tsx unchanged; `rows` is the current page. */
export default function PengirimanSentList({ rows, onSuratJalan }: { rows: PengirimanSentRow[]; onSuratJalan: (t: SuratJalanTarget) => void }) {
  return (
    <>
      <div className="hidden xl:block">
        <div>
          <div>
            <div className={`grid items-center gap-3 rounded-t-2xl bg-surface px-5 py-3 ${GRID_SENT} ${th}`}>
              <span>Status</span>
              <span>Pelanggan</span>
              <span>Kurir</span>
              <span>Jadwal Kirim</span>
              <span>Tgl Kirim</span>
              <span>Pembayaran</span>
              <span>Dikirim oleh</span>
              <span />
            </div>
            {rows.map((r) => (
              <div
                key={r.invoiceId}
                className={`grid items-center gap-3 border-t border-line px-5 py-3 first:border-t-0 ${GRID_SENT}`}
              >
                <span>
                  <FollowUpStatusBadge status="paid" label="Terkirim" />
                </span>
                <span className="min-w-0 font-sans text-[0.85rem] font-extrabold">
                  {r.customerNama}
                  <small className="block font-mono text-[0.68rem] font-medium text-muted">{r.nomor} · {r.kota ?? "-"}</small>
                </span>
                <span className="min-w-0 text-[0.8rem]">
                  {r.kurir ?? "-"}
                  {r.noResiKirim && (
                    <span className="block break-all text-[0.7rem] font-semibold text-muted">Resi {r.noResiKirim}</span>
                  )}
                </span>
                <span className="font-mono text-[0.78rem] tabular-nums">{fmt(r.jadwal)}</span>
                <span className="font-mono text-[0.78rem] font-bold tabular-nums">{fmt(r.tanggalKirim)}</span>
                <span>
                  <FollowUpStatusBadge status={r.bayar} />
                </span>
                <span className="text-[0.8rem]">{r.dikirimOleh ?? "-"}</span>
                <span className="flex flex-col items-start gap-1">
                  <SuratJalanButton row={r} onOpen={onSuratJalan} />
                  <BatalkanButton row={r} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:hidden">
        {rows.map((r) => (
          <div key={r.invoiceId} className="border-t border-line px-4 py-3.5 first:border-t-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 font-sans text-[0.9rem] font-extrabold">
                {r.customerNama}
                <small className="block font-mono text-[0.68rem] font-medium text-muted">
                  {r.nomor} · {r.kota ?? "-"}
                </small>
              </div>
              <FollowUpStatusBadge status="paid" label="Terkirim" />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.75rem]">
              <FollowUpStatusBadge status={r.bayar} />
              <span className="text-muted">
                {r.kurir ?? "-"} · oleh {r.dikirimOleh ?? "-"}
              </span>
            </div>
            {r.noResiKirim && (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[0.75rem]">
                <span className="text-muted">No. Resi</span>
                <b className="break-all">{r.noResiKirim}</b>
              </div>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[0.75rem]">
              <span className="text-muted">Jadwal kirim</span>
              <b className="tabular-nums">{fmt(r.jadwal)}</b>
              <span className="text-muted">· Tgl kirim</span>
              <b className="tabular-nums">{fmt(r.tanggalKirim)}</b>
            </div>
            <div className="mt-3 flex gap-2">
              <SuratJalanButton row={r} onOpen={onSuratJalan} className="flex-1" />
              <BatalkanButton row={r} className="flex-1" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
