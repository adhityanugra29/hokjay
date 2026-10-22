"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatCard from "@/components/ui/StatCard";
import { Panel } from "@/components/ui/Panel";
import FollowUpStatusBadge from "@/components/dashboard/FollowUpStatusBadge";
import TandaiKirimButton, { type CourierOption } from "@/components/invoice/TandaiKirimButton";
import { useDialog } from "@/components/ui/Dialog";
import { formatDateShort, rupiah } from "@/lib/format";
import type { PengirimanSentRow, PengirimanTodoRow } from "@/lib/pengiriman";

/**
 * /pengiriman (TASK-046) — mockup docs/SDD/mockups/pengiriman-v1.html.
 * Two tabs over the shipping data the server already filtered per role:
 * "Perlu Dikirim" (status, Jadwal Kirim, Tgl Kirim "Belum", one primary
 * action) and "Sudah Dikirim" (Tgl Kirim, resi, Batalkan). Filters (search,
 * bulan, kurir, pembayaran) run client-side on the rows we were handed. The
 * bulan filter uses Jadwal Kirim on Perlu Dikirim and Tgl Kirim on Sudah
 * Dikirim; an invoice with no jadwal drops out once a month is chosen.
 */

type Tab = "kirim" | "sent";
type Group = "late" | "today" | "later" | "none";

const MONTH_LONG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function ymOf(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function ymLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTH_LONG[Number(m) - 1]} ${y}`;
}
function groupOf(r: PengirimanTodoRow): Group {
  return r.tone === "overdue" ? "late" : r.tone === "today" ? "today" : r.tone === "none" ? "none" : "later";
}

const TONE_CLS: Record<PengirimanTodoRow["tone"], string> = {
  overdue: "text-red-600",
  today: "text-accent-700",
  soon: "text-ink",
  later: "text-ink",
  none: "text-muted",
};

const selectCls = "min-w-0 rounded-lg border border-line bg-panel px-3 py-2 font-sans text-[0.8rem] text-ink";
const GRID_TODO =
  "md:grid-cols-[130px_minmax(0,1.5fr)_80px_100px_76px_76px_88px_96px_minmax(0,150px)_32px]";
const GRID_SENT = "md:grid-cols-[92px_minmax(0,1.5fr)_80px_110px_76px_76px_96px_110px_110px]";

const th = "font-sans text-[0.66rem] font-bold uppercase tracking-wider text-muted";
const fmt = (iso?: string) => (iso ? formatDateShort(iso) : "-");

function Kebab({
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

const menuItemCls =
  "cursor-pointer rounded-lg border-0 bg-transparent px-3 py-2 text-left font-sans text-[0.8rem] font-bold text-ink no-underline hover:bg-accent-100";

function BatalkanButton({ row, className }: { row: PengirimanSentRow; className?: string }) {
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
      className={`cursor-pointer rounded-lg border border-line bg-transparent px-3 py-1.5 font-sans text-[0.75rem] font-extrabold text-danger hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 ${
        className ?? ""
      }`}
    >
      {busy ? "Membatalkan..." : "Batalkan"}
    </button>
  );
}

function Detail({ alamat, catatan }: { alamat?: string; catatan?: string }) {
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

export default function PengirimanClient({
  todo,
  sent,
  couriers,
}: {
  todo: PengirimanTodoRow[];
  sent: PengirimanSentRow[];
  couriers: CourierOption[];
}) {
  const [tab, setTab] = useState<Tab>("kirim");
  const [urg, setUrg] = useState<"all" | Group>("all");
  const [q, setQ] = useState("");
  const [bulan, setBulan] = useState("");
  const [kurir, setKurir] = useState("");
  const [bayar, setBayar] = useState("");
  const [menu, setMenu] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menu]);

  const bulanOptions = useMemo(() => {
    const set = new Set<string>();
    const now = new Date();
    set.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    for (const r of todo) {
      const ym = ymOf(r.jadwal);
      if (ym) set.add(ym);
    }
    for (const r of sent) {
      const ym = ymOf(r.tanggalKirim);
      if (ym) set.add(ym);
    }
    return [...set].sort().reverse();
  }, [todo, sent]);

  const kurirOptions = useMemo(
    () => [...new Set([...couriers.map((c) => c.name), ...todo.map((r) => r.kurir), ...sent.map((r) => r.kurir)])].filter(Boolean) as string[],
    [couriers, todo, sent]
  );

  function match(r: PengirimanTodoRow | PengirimanSentRow, dateIso?: string) {
    const needle = q.trim().toLowerCase();
    const resi = "noResiKirim" in r ? (r.noResiKirim ?? "") : "";
    if (needle && !`${r.customerNama} ${r.nomor} ${r.kota ?? ""} ${resi}`.toLowerCase().includes(needle)) return false;
    if (bulan && ymOf(dateIso) !== bulan) return false;
    if (kurir && r.kurir !== kurir) return false;
    if (bayar && r.bayar !== bayar) return false;
    return true;
  }

  const todoByFilter = todo.filter((r) => match(r, r.jadwal));
  const todoRows = todoByFilter.filter((r) => urg === "all" || groupOf(r) === urg);
  const sentRows = sent.filter((r) => match(r, r.tanggalKirim));
  const count = (g: Group) => todoByFilter.filter((r) => groupOf(r) === g).length;
  const filtered = !!(q || bulan || kurir || bayar) || urg !== "all";

  function reset() {
    setQ("");
    setBulan("");
    setKurir("");
    setBayar("");
    setUrg("all");
  }

  const stats: [Group, string, string][] = [
    ["late", "Terlambat", "text-red-600"],
    ["today", "Hari Ini", "text-accent-700"],
    ["later", "Terjadwal", ""],
    ["none", "Belum Dijadwalkan", ""],
  ];

  const rows = tab === "kirim" ? todoRows : sentRows;

  return (
    <div className="flex flex-col gap-4 p-6 md:p-9">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([g, label, tone]) => (
          <button
            key={g}
            type="button"
            onClick={() => {
              setTab("kirim");
              setUrg(urg === g ? "all" : g);
            }}
            aria-pressed={urg === g}
            className={`cursor-pointer rounded-xl border-2 bg-transparent p-0 text-left ${
              urg === g ? "border-ink" : "border-transparent hover:border-accent-600"
            }`}
          >
            <div className={tone}>
              <StatCard label={label} value={String(count(g))} />
            </div>
          </button>
        ))}
      </div>

      <div role="tablist" className="flex gap-6 border-b border-line">
        {(
          [
            ["kirim", "Perlu Dikirim", todoByFilter.length],
            ["sent", "Sudah Dikirim", sentRows.length],
          ] as const
        ).map(([key, label, n]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px cursor-pointer border-0 border-b-[3px] bg-transparent px-0.5 pt-2 pb-2.5 font-sans text-[0.9rem] font-extrabold ${
              tab === key ? "border-accent text-ink" : "border-transparent text-muted"
            }`}
          >
            {label}
            <span className="ml-1.5 rounded-full bg-surface px-2 py-px font-sans text-[0.68rem] tabular-nums">{n}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari pelanggan, no. invoice, kota, resi"
          aria-label="Cari"
          className="min-w-0 flex-[1_1_200px] rounded-lg border border-line bg-panel px-3 py-2 font-sans text-[0.8rem] text-ink"
        />
        <select value={bulan} onChange={(e) => setBulan(e.target.value)} aria-label="Bulan" className={selectCls}>
          <option value="">Semua bulan</option>
          {bulanOptions.map((m) => (
            <option key={m} value={m}>
              {ymLabel(m)}
            </option>
          ))}
        </select>
        <select value={kurir} onChange={(e) => setKurir(e.target.value)} aria-label="Kurir" className={selectCls}>
          <option value="">Semua kurir</option>
          {kurirOptions.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select value={bayar} onChange={(e) => setBayar(e.target.value)} aria-label="Pembayaran" className={selectCls}>
          <option value="">Semua pembayaran</option>
          <option value="paid">Lunas</option>
          <option value="dp">Sudah DP</option>
          <option value="unpaid">Belum Bayar</option>
          <option value="draft">Draft</option>
        </select>
        {filtered && (
          <button
            type="button"
            onClick={reset}
            className="cursor-pointer border-0 bg-transparent font-sans text-[0.75rem] font-bold text-accent-700 underline underline-offset-4"
          >
            Reset
          </button>
        )}
      </div>

      <Panel>
        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="font-sans text-[1.05rem] font-extrabold">
              {tab === "sent"
                ? filtered
                  ? "Tidak ada yang cocok"
                  : "Belum ada pengiriman"
                : filtered
                  ? "Tidak ada yang cocok"
                  : "Semua sudah terkirim"}
            </div>
            <p className="mx-auto mt-1.5 max-w-[40ch] font-sans text-[0.85rem] text-muted">
              {filtered
                ? "Ubah atau hapus filter untuk melihat invoice lain."
                : tab === "sent"
                  ? "Invoice yang ditandai terkirim muncul di sini."
                  : "Tidak ada invoice yang menunggu dikirim. Cek tab Sudah Dikirim untuk riwayat."}
            </p>
          </div>
        ) : tab === "kirim" ? (
          <>
            {/* Desktop table (md+) */}
            <div className="hidden md:block">
              <div className="overflow-x-auto xl:overflow-visible">
                <div className="min-w-[1000px]">
                  <div className={`grid items-center gap-3 rounded-t-2xl bg-surface px-5 py-3 ${GRID_TODO} ${th}`}>
                    <span>Status</span>
                    <span>Pelanggan</span>
                    <span>Kota</span>
                    <span>Kurir</span>
                    <span>Jadwal Kirim</span>
                    <span>Tgl Kirim</span>
                    <span>Ongkir</span>
                    <span>Pembayaran</span>
                    <span />
                    <span />
                  </div>
                  {todoRows.map((r, i) => {
                    const up = todoRows.length > 3 && i >= todoRows.length - 2;
                    return (
                      <div key={r.invoiceId} className="border-t border-line first:border-t-0">
                        <div className={`grid items-center gap-3 px-5 py-3 ${GRID_TODO}`}>
                          <span className={`font-sans text-[0.75rem] font-extrabold ${TONE_CLS[r.tone]}`}>{r.statusLabel}</span>
                          <span className="min-w-0 font-sans text-[0.85rem] font-extrabold">
                            {r.customerNama}
                            <small className="block font-mono text-[0.68rem] font-medium text-muted">
                              {r.nomor} · {r.salesNama}
                            </small>
                          </span>
                          <span className="text-[0.8rem]">{r.kota ?? "-"}</span>
                          <span className="text-[0.8rem]">{r.kurir || <span className="text-muted">Belum dipilih</span>}</span>
                          <span className="font-mono text-[0.78rem] tabular-nums">{fmt(r.jadwal)}</span>
                          <span className="font-mono text-[0.78rem] text-muted">Belum</span>
                          <span className="font-mono text-[0.78rem] tabular-nums">{r.ongkir ? rupiah(r.ongkir) : "-"}</span>
                          <span>
                            <FollowUpStatusBadge status={r.bayar} />
                          </span>
                          <span className="flex">
                            {r.bayar === "draft" ? (
                              <Link
                                href={`/invoice/${r.invoiceId}/ubah`}
                                className="rounded-lg border border-accent px-3 py-1.5 font-sans text-[0.75rem] font-extrabold text-accent-700 no-underline hover:bg-accent hover:text-ink"
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
            <div className="flex flex-col md:hidden">
              {todoRows.map((r, i) => {
                const up = todoRows.length > 3 && i >= todoRows.length - 2;
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
                          className="flex-1 rounded-lg border border-accent px-3 py-2 text-center font-sans text-[0.78rem] font-extrabold text-accent-700 no-underline"
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
                          className="flex-1 cursor-pointer border border-ink bg-ink px-3 py-2 font-sans text-[0.78rem] font-semibold text-accent hover:bg-ink/85"
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
        ) : (
          <>
            <div className="hidden md:block">
              <div className="overflow-x-auto xl:overflow-visible">
                <div className="min-w-[960px]">
                  <div className={`grid items-center gap-3 rounded-t-2xl bg-surface px-5 py-3 ${GRID_SENT} ${th}`}>
                    <span>Status</span>
                    <span>Pelanggan</span>
                    <span>Kota</span>
                    <span>Kurir</span>
                    <span>Jadwal Kirim</span>
                    <span>Tgl Kirim</span>
                    <span>Pembayaran</span>
                    <span>Dikirim oleh</span>
                    <span />
                  </div>
                  {sentRows.map((r) => (
                    <div
                      key={r.invoiceId}
                      className={`grid items-center gap-3 border-t border-line px-5 py-3 first:border-t-0 ${GRID_SENT}`}
                    >
                      <span>
                        <FollowUpStatusBadge status="paid" label="Terkirim" />
                      </span>
                      <span className="min-w-0 font-sans text-[0.85rem] font-extrabold">
                        {r.customerNama}
                        <small className="block font-mono text-[0.68rem] font-medium text-muted">{r.nomor}</small>
                      </span>
                      <span className="text-[0.8rem]">{r.kota ?? "-"}</span>
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
                      <span>
                        <BatalkanButton row={r} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col md:hidden">
              {sentRows.map((r) => (
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
                  <div className="mt-3">
                    <BatalkanButton row={r} className="w-full" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
