import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { RowActionLink } from "@/components/ui/RowAction";
import { SearchInput } from "@/components/ui/Panel";
import MobilePelangganList from "@/components/pelanggan/MobilePelangganList";
import PelangganKotaFilter from "@/components/pelanggan/PelangganKotaFilter";
import { getPelangganSummary } from "@/lib/pelanggan";
import { getSession } from "@/lib/auth/session";
import { rupiah, rupiahCompact } from "@/lib/format";
import { parseSort, sortRows, type SortDir } from "@/lib/sort";

export const dynamic = "force-dynamic";

const SORT_FIELDS = ["kode", "nama", "orderCount", "nilaiBelanja", "piutang"] as const;
type PelangganSortField = (typeof SORT_FIELDS)[number];

/** Pelanggan — "daftar prioritas" per the 2026-08-22 redesign ("3b"): piutang, kebiasaan bayar, dan siapa mulai jarang pesan, bukan buku alamat datar. */
export default async function PelangganPage({ searchParams }: PageProps<"/pelanggan">) {
  const sp = await searchParams;
  // "Jarang pesan" filter option removed per the user's request
  // 2026-08-25 — the "Mulai jarang pesan" stat card above stays (it's
  // informational, not a filter), only the list filter button is gone.
  const filter = sp.filter === "piutang" ? "piutang" : "semua";
  // Search (nama/kode) + Kota — per the user's request 2026-09-19
  // ("tampilkan filter di setiap header tablenya"). Filtered in-memory
  // alongside the existing piutang toggle, same as getPelangganSummary's
  // own doc comment already justifies (customer count small enough that a
  // full scan per page load is cheap) — no new query needed.
  const search = typeof sp.search === "string" ? sp.search.trim().toLowerCase() : "";
  const kota = typeof sp.kota === "string" ? sp.kota : "";
  // Sortable column headers — per the user's request 2026-09-19 ("kamu
  // harus berikan button untuk sort, di setiap header tablenya"). No
  // explicit sort param = keep getPelangganSummary's own default order
  // (nilaiBelanja desc) rather than forcing "asc" like parseSort's normal
  // fallback would.
  const hasSort = typeof sp.sort === "string" && (SORT_FIELDS as readonly string[]).includes(sp.sort);
  const { field: sortField, dir: sortDir } = parseSort(sp, SORT_FIELDS, "nilaiBelanja");
  const session = await getSession();
  // Per-sales customer privacy (2026-08-27) — see customerVisibilityFilter
  // in lib/pelanggan.ts for the exact rule.
  const summary = await getPelangganSummary(session);

  const matchedRows = summary.rows.filter((r) => {
    if (filter === "piutang" && !(r.piutang > 0)) return false;
    if (search && !r.nama.toLowerCase().includes(search) && !r.kode.toLowerCase().includes(search)) return false;
    if (kota && r.kota !== kota) return false;
    return true;
  });
  const filteredRows = hasSort ? sortRows(matchedRows, sortField, sortDir) : matchedRows;

  const emptyMessage =
    // Only the true empty-account state gets the "add first customer" nudge
    // — a search/kota/piutang filter that just happens to match nothing
    // gets the generic message instead. Per the user's request 2026-09-19
    // ("tampilkan filter di setiap header tablenya") — before this, an
    // empty search result on the default "semua" pill would have wrongly
    // shown "Belum ada pelanggan" even with customers in the account.
    summary.rows.length === 0 ? (
      <>
        Belum ada pelanggan.{" "}
        <Link href="/pelanggan/baru" className="text-accent-700 underline underline-offset-2">
          Tambah pelanggan pertama
        </Link>
        .
      </>
    ) : (
      "Tidak ada pelanggan yang cocok dengan filter ini."
    );

  return (
    <>
      <PageHeader
        title="Pelanggan"
        subtitle="Bukan buku alamat. Yang dilihat duluan: siapa masih punya utang, siapa mulai jarang pesan, siapa layak diprioritaskan."
        actions={<LinkButton href="/pelanggan/baru">+ Pelanggan baru</LinkButton>}
      />
      <div className="p-6 md:p-9">
        {/* "Extreme"/"Soft Trade" rework (2026-08-30) — the whole page was
            still the original flat "Rak & Rel" hard-bordered table style,
            never touched by the Foundry work so far. Same data/logic,
            every hard border-2/border-b-2 replaced with soft rounded
            cards + shadows, filter toggle became a pill, and the flat
            row list became hover-highlighted rows inside one card. Per
            the user's request 2026-08-30 ("saya butuh perubahan extreme
            ... simple dan seamless"). */}
        <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <div className="min-w-0 rounded-xl bg-panel p-4.5 shadow-sm">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Pelanggan aktif
            </div>
            <div className="mt-1.5 font-sans text-[1.3rem] font-extrabold">{summary.pelangganAktif}</div>
            <div className="mt-1 font-mono text-[0.68rem] text-muted">pesan dalam 90 hari</div>
          </div>
          <div className="min-w-0 rounded-xl bg-panel p-4.5 shadow-sm">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Total piutang
            </div>
            <div className="mt-1.5 font-sans text-[1.3rem] font-extrabold text-accent-700 whitespace-nowrap">
              {rupiah(summary.totalPiutang)}
            </div>
            <div className="mt-1 font-mono text-[0.68rem] text-muted">tersebar di {summary.piutangCustomerCount} pelanggan</div>
          </div>
          <div className="min-w-0 rounded-xl bg-panel p-4.5 shadow-sm">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Lewat jatuh tempo
            </div>
            <div className="mt-1.5 font-sans text-[1.3rem] font-extrabold">{summary.lewatJatuhTempoCount} pelanggan</div>
            <div className="mt-1 font-mono text-[0.68rem] text-muted">senilai {rupiahCompact(summary.lewatJatuhTempoTotal)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1fr_280px]">
          <div className="overflow-hidden rounded-2xl bg-panel shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="font-sans text-[0.92rem] font-extrabold text-ink">Semua pelanggan</div>
              <div className="flex flex-wrap items-center gap-2.5">
                <form className="w-full sm:w-auto">
                  {kota ? <input type="hidden" name="kota" value={kota} /> : null}
                  {filter === "piutang" ? <input type="hidden" name="filter" value="piutang" /> : null}
                  <SearchInput name="search" defaultValue={sp.search as string} placeholder="Cari nama atau kode..." />
                </form>
                <PelangganKotaFilter kota={kota} availableKota={summary.kotaTerbesar.map((k) => k.kota)} />
                <div className="flex gap-1.5 rounded-full bg-surface p-1">
                  <Link
                    href={buildPelangganHref({ kota, search: sp.search as string }, "semua")}
                    className={`rounded-full px-3 py-1.5 font-sans text-[0.72rem] font-semibold transition ${filter === "semua" ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
                  >
                    Semua
                  </Link>
                  <Link
                    href={buildPelangganHref({ kota, search: sp.search as string }, "piutang")}
                    className={`rounded-full px-3 py-1.5 font-sans text-[0.72rem] font-semibold transition ${filter === "piutang" ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
                  >
                    Ada piutang
                  </Link>
                </div>
              </div>
            </div>

            {/* Mobile card list below md; the fixed-column grid table takes
                over at md+. Per the user's request 2026-08-25. */}
            <MobilePelangganList rows={filteredRows} emptyMessage={emptyMessage} />
            <div className="hidden md:block">
              {/* "Kebiasaan bayar" column removed per the user's request
                  2026-08-25. */}
              <div className="grid grid-cols-[100px_1.5fr_70px_105px_100px_60px] gap-3.5 border-b border-line px-5 py-2.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted">
                <SortCol sp={sp} activeField={hasSort ? sortField : ""} dir={sortDir} column="kode">
                  Kode
                </SortCol>
                <SortCol sp={sp} activeField={hasSort ? sortField : ""} dir={sortDir} column="nama">
                  Pelanggan
                </SortCol>
                <SortCol sp={sp} activeField={hasSort ? sortField : ""} dir={sortDir} column="orderCount">
                  Frekuensi
                </SortCol>
                <SortCol sp={sp} activeField={hasSort ? sortField : ""} dir={sortDir} column="nilaiBelanja" align="right">
                  Nilai belanja
                </SortCol>
                <SortCol sp={sp} activeField={hasSort ? sortField : ""} dir={sortDir} column="piutang" align="right">
                  Piutang
                </SortCol>
                <span />
              </div>
              {filteredRows.map((r) => (
                <div
                  key={r._id}
                  className="grid grid-cols-[100px_1.5fr_70px_105px_100px_60px] items-center gap-3.5 border-b border-line px-5 py-3.5 text-[0.85rem] transition last:border-b-0 hover:bg-surface"
                >
                  <div className="font-mono text-[0.7rem] text-muted">{r.kode}</div>
                  <div>
                    <div className="font-semibold">{r.nama}</div>
                    {r.kota && <div className="mt-0.5 font-mono text-[0.7rem] text-muted">{r.kota}</div>}
                  </div>
                  <div className="font-mono text-[0.75rem] text-muted">{r.orderCount} order</div>
                  <div className="text-right font-bold">{rupiahCompact(r.nilaiBelanja)}</div>
                  <div className={`text-right font-bold ${r.piutang > 0 ? "text-accent-700" : "text-muted/40"}`}>
                    {r.piutang > 0 ? rupiahCompact(r.piutang) : "0"}
                  </div>
                  <div className="text-right">
                    <RowActionLink href={`/pelanggan/${r._id}`}>Riwayat</RowActionLink>
                  </div>
                </div>
              ))}
              {filteredRows.length === 0 && (
                <div className="py-10 text-center font-mono text-sm text-muted">{emptyMessage}</div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="rounded-2xl bg-panel p-5 shadow-sm">
              <div className="font-sans text-[0.82rem] font-extrabold text-ink">Perlu ditelepon minggu ini</div>
              <div className="mt-2.5">
                {summary.perluDitelepon.map((r) => (
                  <div key={r._id} className="border-b border-line py-3 last:border-b-0 last:pb-0">
                    <div className="font-sans text-[0.8rem] font-semibold">{r.nama}</div>
                    <div className="mt-1 font-mono text-[0.7rem] text-muted">
                      {r.kebiasaanBayar === "lewat"
                        ? `${rupiahCompact(r.piutang)} lewat ${r.hariTerlambat} hari`
                        : `Biasa pesan rutin, ${r.hariSejakOrderTerakhir} hari diam`}
                    </div>
                  </div>
                ))}
                {summary.perluDitelepon.length === 0 && (
                  <div className="font-mono text-[0.75rem] text-muted">
                    Tidak ada yang perlu ditindaklanjuti minggu ini. 🎉
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-panel p-5 shadow-sm">
              <div className="font-sans text-[0.82rem] font-extrabold text-ink">Kota terbesar</div>
              <div className="mt-2.5">
                {summary.kotaTerbesar.map((k) => (
                  <div key={k.kota} className="flex items-center justify-between border-b border-line py-2.5 font-sans text-[0.8rem] last:border-b-0 last:pb-0">
                    <span>{k.kota}</span>
                    <b>{k.count} pelanggan</b>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Builds /pelanggan's href preserving search/kota when switching the Semua/Ada Piutang pill. */
function buildPelangganHref(current: { kota?: string; search?: string }, filter: "semua" | "piutang"): string {
  const params = new URLSearchParams();
  if (current.search) params.set("search", current.search);
  if (current.kota) params.set("kota", current.kota);
  if (filter === "piutang") params.set("filter", "piutang");
  const qs = params.toString();
  return qs ? `/pelanggan?${qs}` : "/pelanggan";
}

/**
 * A sortable column label for /pelanggan's div-grid "table" — same
 * preserve-every-other-param + toggle-asc/desc behavior as
 * components/ui/SortableHeader.tsx, just rendered as a plain span/Link
 * pair instead of a real `<th>` since this page isn't a `<table>`. Per
 * the user's request 2026-09-19 ("kamu harus berikan button untuk sort,
 * di setiap header tablenya").
 */
function SortCol({
  sp,
  activeField,
  dir,
  column,
  align = "left",
  children,
}: {
  sp: Record<string, string | string[] | undefined>;
  activeField: string;
  dir: SortDir;
  column: PelangganSortField;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const active = activeField === column;
  const nextDir: SortDir = active && dir === "asc" ? "desc" : "asc";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "sort" || k === "dir") continue;
    if (typeof v === "string") params.set(k, v);
  }
  params.set("sort", column);
  params.set("dir", nextDir);

  return (
    <Link
      href={`/pelanggan?${params.toString()}`}
      className={`inline-flex select-none items-center gap-1 hover:text-ink ${active ? "text-ink" : ""} ${
        align === "right" ? "justify-end text-right" : ""
      }`}
    >
      {children}
      <span className={`text-[0.6rem] ${active ? "opacity-100" : "opacity-35"}`}>
        {active ? (dir === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    </Link>
  );
}
