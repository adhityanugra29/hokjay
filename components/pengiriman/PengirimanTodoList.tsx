"use client";

import Link from "next/link";
import FollowUpStatusBadge from "@/components/dashboard/FollowUpStatusBadge";
import TandaiKirimButton, { type CourierOption } from "@/components/invoice/TandaiKirimButton";
import { rupiah } from "@/lib/format";
import type { PengirimanTodoRow } from "@/lib/pengiriman";
import { Detail, GRID_TODO, Kebab, PRIMARY_CLS, TONE_CLS, fmt, menuItemCls, th, type SuratJalanTarget } from "./rowParts";

/** The "Perlu Dikirim" list (desktop table + mobile cards), moved out of PengirimanClient.tsx unchanged; `rows` is the current page. */
export default function PengirimanTodoList({
  rows,
  couriers,
  menu,
  setMenu,
  open,
  setOpen,
  onSuratJalan,
}: {
  rows: PengirimanTodoRow[];
  couriers: CourierOption[];
  menu: string | null;
  setMenu: (id: string | null) => void;
  open: Record<string, boolean>;
  setOpen: (v: Record<string, boolean>) => void;
  onSuratJalan: (t: SuratJalanTarget) => void;
}) {
  return (
    <>
      {/* Desktop table (md+) */}
      <div className="hidden xl:block">
        <div>
          <div>
            <div className={`grid items-center gap-3 rounded-t-2xl bg-surface px-5 py-3 ${GRID_TODO} ${th}`}>
              <span>Status</span>
              <span>Pelanggan</span>
              <span>Kurir</span>
              <span>Jadwal Kirim</span>
              <span>Pembayaran</span>
              <span />
              <span />
            </div>
            {rows.map((r, i) => {
              const up = rows.length > 3 && i >= rows.length - 2;
              return (
                <div key={r.invoiceId} className="border-t border-line first:border-t-0">
                  <div className={`grid items-center gap-3 px-5 py-3 ${GRID_TODO}`}>
                    <span className={`font-sans text-[0.75rem] font-extrabold ${TONE_CLS[r.tone]}`}>{r.statusLabel}</span>
                    <span className="min-w-0 font-sans text-[0.85rem] font-extrabold">
                      {r.customerNama}
                      <small className="block font-mono text-[0.68rem] font-medium text-muted">
                        {r.nomor} · {r.kota ?? "-"} · {r.salesNama}
                      </small>
                    </span>
                    <span className="min-w-0 text-[0.8rem]">
                      {r.kurir || <span className="text-muted">Belum dipilih</span>}
                      {r.ongkir ? (
                        <small className="block font-mono text-[0.68rem] text-muted">{rupiah(r.ongkir)}</small>
                      ) : null}
                    </span>
                    <span className="font-mono text-[0.78rem] tabular-nums">{fmt(r.jadwal)}</span>
                    <span>
                      <FollowUpStatusBadge status={r.bayar} />
                    </span>
                    <span className="flex">
                      {r.bayar === "draft" ? (
                        <Link
                          href={`/invoice/${r.invoiceId}/ubah`}
                          className="rounded-lg border border-accent px-3.5 py-2 font-sans text-[0.78rem] font-extrabold text-accent-700 no-underline hover:bg-accent hover:text-ink"
                        >
                          Lanjutkan
                        </Link>
                      ) : (
                        <TandaiKirimButton
                          invoiceId={r.invoiceId}
                          nomor={r.nomor}
                          customerNama={r.customerNama}
                          couriers={couriers}
                          currentKurir={r.kurir}
                        className={PRIMARY_CLS}
                        />
                      )}
                    </span>
                    <Kebab
                      open={menu === r.invoiceId}
                      onToggle={() => setMenu(menu === r.invoiceId ? null : r.invoiceId)}
                      up={up}
                      label={`Aksi lainnya ${r.nomor}`}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className={menuItemCls}
                        onClick={() => {
                          setOpen({ ...open, [r.invoiceId]: !open[r.invoiceId] });
                          setMenu(null);
                        }}
                      >
                        {open[r.invoiceId] ? "Sembunyikan Detail" : "Lihat Detail"}
                      </button>
                      {r.bayar !== "draft" && (
                        <button
                          type="button"
                          role="menuitem"
                          className={menuItemCls}
                          onClick={() => {
                            onSuratJalan({ invoiceId: r.invoiceId, nomor: r.nomor, customerNama: r.customerNama });
                            setMenu(null);
                          }}
                        >
                          Surat Jalan
                        </button>
                      )}
                      <Link role="menuitem" href={`/invoice/${r.invoiceId}`} className={menuItemCls}>
                        Buka Invoice
                      </Link>
                    </Kebab>
                  </div>
                  {open[r.invoiceId] && <Detail alamat={r.alamat} catatan={r.catatan} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile cards (below md) */}
      <div className="flex flex-col xl:hidden">
        {rows.map((r, i) => {
          const up = rows.length > 3 && i >= rows.length - 2;
          return (
            <div key={r.invoiceId} className="border-t border-line px-4 py-3.5 first:border-t-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 font-sans text-[0.9rem] font-extrabold">
                  {r.customerNama}
                  <small className="block font-mono text-[0.68rem] font-medium text-muted">
                    {r.nomor} · {r.kota ?? "-"}
                  </small>
                </div>
                <span className={`whitespace-nowrap font-sans text-[0.72rem] font-extrabold ${TONE_CLS[r.tone]}`}>
                  {r.statusLabel}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.75rem]">
                <FollowUpStatusBadge status={r.bayar} />
                <span className="text-muted">
                  {r.kurir || "Kurir belum dipilih"}
                  {r.ongkir ? ` · ${rupiah(r.ongkir)}` : ""}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[0.75rem]">
                <span className="text-muted">Jadwal kirim</span>
                <b className="tabular-nums">{fmt(r.jadwal)}</b>
                <span className="text-muted">· Tgl kirim</span>
                <b>Belum</b>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {r.bayar === "draft" ? (
                  <Link
                    href={`/invoice/${r.invoiceId}/ubah`}
                    className="flex-1 rounded-lg border border-accent px-3.5 py-2 text-center font-sans text-[0.78rem] font-extrabold text-accent-700 no-underline"
                  >
                    Lanjutkan
                  </Link>
                ) : (
                  <TandaiKirimButton
                    invoiceId={r.invoiceId}
                    nomor={r.nomor}
                    customerNama={r.customerNama}
                    couriers={couriers}
                    currentKurir={r.kurir}
                    className={`${PRIMARY_CLS} flex-1`}
                  />
                )}
                <Kebab
                  open={menu === r.invoiceId}
                  onToggle={() => setMenu(menu === r.invoiceId ? null : r.invoiceId)}
                  up={up}
                  label={`Aksi lainnya ${r.nomor}`}
                >
                  <button
                    type="button"
                    role="menuitem"
                    className={menuItemCls}
                    onClick={() => {
                      setOpen({ ...open, [r.invoiceId]: !open[r.invoiceId] });
                      setMenu(null);
                    }}
                  >
                    {open[r.invoiceId] ? "Sembunyikan Detail" : "Lihat Detail"}
                  </button>
                  {r.bayar !== "draft" && (
                    <button
                      type="button"
                      role="menuitem"
                      className={menuItemCls}
                      onClick={() => {
                        onSuratJalan({ invoiceId: r.invoiceId, nomor: r.nomor, customerNama: r.customerNama });
                        setMenu(null);
                      }}
                    >
                      Surat Jalan
                    </button>
                  )}
                  <Link role="menuitem" href={`/invoice/${r.invoiceId}`} className={menuItemCls}>
                    Buka Invoice
                  </Link>
                </Kebab>
              </div>
              {open[r.invoiceId] && (
                <div className="mt-3 border-t border-line pt-3">
                  <Detail alamat={r.alamat} catatan={r.catatan} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
