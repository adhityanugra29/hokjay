"use client";

import { useEffect, useMemo, useState } from "react";
import StatCard from "@/components/ui/StatCard";
import { Panel } from "@/components/ui/Panel";
import type { CourierOption } from "@/components/invoice/TandaiKirimButton";
import SuratJalanDrawer from "./SuratJalanDrawer";
import PengirimanTodoList from "./PengirimanTodoList";
import PengirimanSentList from "./PengirimanSentList";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
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

const selectCls = "min-w-0 rounded-lg border border-line bg-panel px-3 py-2 font-sans text-[0.8rem] text-ink";


const PAGE_SIZE = DEFAULT_PAGE_SIZE;
const PAGE_BTN_CLS =
  "cursor-pointer rounded-lg border border-line bg-transparent px-3 py-1.5 font-sans text-[0.78rem] font-bold text-ink hover:bg-black/5 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent";

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
  // Invoice whose Surat Jalan drawer is open (from the row's ⋮ menu on Perlu Dikirim, or the "Surat Jalan" button on Sudah Dikirim).
  const [suratJalan, setSuratJalan] = useState<{ invoiceId: string; nomor: string; customerNama: string } | null>(null);
  const [pageState, setPageState] = useState({ sig: "", page: 1 });

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
    ["today", "Hari Ini", "text-accent-700"],
    ["late", "Terlambat", "text-red-600"],
    ["later", "Terjadwal", ""],
    ["none", "Belum Dijadwalkan", ""],
  ];

  const rows = tab === "kirim" ? todoRows : sentRows;

  // Client-side pagination (filters and the Perlu Dikirim order are computed here, so the full set is already loaded; paging just limits what is rendered).
  // The page resets to 1 whenever the tab or any filter changes, via the signature below instead of an effect.
  const pageSig = [tab, urg, q, bulan, kurir, bayar].join("|");
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(pageState.sig === pageSig ? pageState.page : 1, totalPages);
  const pagedTodo = todoRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pagedSent = sentRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const goPage = (p: number) => setPageState({ sig: pageSig, page: p });

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
          <PengirimanTodoList rows={pagedTodo} couriers={couriers} menu={menu} setMenu={setMenu} open={open} setOpen={setOpen} onSuratJalan={setSuratJalan} />
        ) : (
          <PengirimanSentList rows={pagedSent} onSuratJalan={setSuratJalan} />
        )}
      </Panel>

      {totalPages > 1 && (
        <nav aria-label="Halaman" className="flex items-center justify-between gap-3">
          <button type="button" disabled={page <= 1} onClick={() => goPage(page - 1)} className={PAGE_BTN_CLS}>
            ← Sebelumnya
          </button>
          <span className="font-mono text-[0.75rem] text-muted">
            Halaman {page} dari {totalPages}
          </span>
          <button type="button" disabled={page >= totalPages} onClick={() => goPage(page + 1)} className={PAGE_BTN_CLS}>
            Berikutnya →
          </button>
        </nav>
      )}

      {suratJalan && <SuratJalanDrawer key={suratJalan.invoiceId} {...suratJalan} onClose={() => setSuratJalan(null)} />}
    </div>
  );
}
