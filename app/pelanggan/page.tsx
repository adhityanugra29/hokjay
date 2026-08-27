import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { RowActionLink } from "@/components/ui/RowAction";
import MobilePelangganList from "@/components/pelanggan/MobilePelangganList";
import { getPelangganSummary } from "@/lib/pelanggan";
import { getSession } from "@/lib/auth/session";
import { rupiah, rupiahCompact } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Pelanggan — "daftar prioritas" per the 2026-08-22 redesign ("3b"): piutang, kebiasaan bayar, dan siapa mulai jarang pesan, bukan buku alamat datar. */
export default async function PelangganPage({ searchParams }: PageProps<"/pelanggan">) {
  const sp = await searchParams;
  // "Jarang pesan" filter option removed per the user's request
  // 2026-08-25 — the "Mulai jarang pesan" stat card above stays (it's
  // informational, not a filter), only the list filter button is gone.
  const filter = sp.filter === "piutang" ? "piutang" : "semua";
  const session = await getSession();
  // Per-sales customer privacy (2026-08-27) — see customerVisibilityFilter
  // in lib/pelanggan.ts for the exact rule.
  const summary = await getPelangganSummary(session);

  const filteredRows = summary.rows.filter((r) => {
    if (filter === "piutang") return r.piutang > 0;
    return true;
  });

  const emptyMessage =
    filter === "semua" ? (
      <>
        Belum ada pelanggan.{" "}
        <Link href="/pelanggan/baru" className="text-accent underline underline-offset-2">
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
        {/* "Mulai jarang pesan" stat card removed per the user's request
            2026-08-25 — down to 3 cards, 1-column on mobile. */}
        <div className="mb-6 grid grid-cols-1 border-2 border-ink bg-panel sm:grid-cols-3">
          <div className="min-w-0 border-b border-line p-4 sm:border-r sm:border-b-0 sm:p-4.5">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Pelanggan aktif
            </div>
            <div className="mt-1.5 font-sans text-[1.15rem] font-extrabold sm:text-[1.3rem]">{summary.pelangganAktif}</div>
            <div className="mt-1 font-mono text-[0.68rem] text-muted">pesan dalam 90 hari</div>
          </div>
          <div className="min-w-0 border-b border-line p-4 sm:border-r sm:border-b-0 sm:p-4.5">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Total piutang
            </div>
            <div className="mt-1.5 font-sans text-[1.05rem] font-extrabold text-accent sm:whitespace-nowrap sm:text-[1.3rem]">
              {rupiah(summary.totalPiutang)}
            </div>
            <div className="mt-1 font-mono text-[0.68rem] text-muted">tersebar di {summary.piutangCustomerCount} pelanggan</div>
          </div>
          <div className="min-w-0 p-4 sm:p-4.5">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Lewat jatuh tempo
            </div>
            <div className="mt-1.5 font-sans text-[1.15rem] font-extrabold sm:text-[1.3rem]">{summary.lewatJatuhTempoCount} pelanggan</div>
            <div className="mt-1 font-mono text-[0.68rem] text-muted">senilai {rupiahCompact(summary.lewatJatuhTempoTotal)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1fr_264px]">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-2.5">
              <div className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
                Semua pelanggan
              </div>
              <div className="flex gap-2">
                <Link
                  href="/pelanggan"
                  className={`border px-2.5 py-1.5 font-mono text-[0.7rem] ${filter === "semua" ? "border-ink bg-ink text-white" : "border-line text-ink hover:border-accent"}`}
                >
                  Semua
                </Link>
                <Link
                  href="/pelanggan?filter=piutang"
                  className={`border px-2.5 py-1.5 font-mono text-[0.7rem] ${filter === "piutang" ? "border-ink bg-ink text-white" : "border-line text-ink hover:border-accent"}`}
                >
                  Ada piutang
                </Link>
              </div>
            </div>

            {/* Mobile card list below md; the fixed-column grid table takes
                over at md+. Per the user's request 2026-08-25. */}
            <MobilePelangganList rows={filteredRows} emptyMessage={emptyMessage} />
            <div className="hidden md:block">
              {/* "Kebiasaan bayar" column removed per the user's request
                  2026-08-25. */}
              <div className="grid grid-cols-[100px_1.5fr_70px_105px_100px_60px] gap-3.5 border-b border-line py-2.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted">
                <span>Kode</span>
                <span>Pelanggan</span>
                <span>Frekuensi</span>
                <span className="text-right">Nilai belanja</span>
                <span className="text-right">Piutang</span>
                <span />
              </div>
              {filteredRows.map((r) => (
                <div key={r._id} className="grid grid-cols-[100px_1.5fr_70px_105px_100px_60px] items-center gap-3.5 border-b border-line py-3.5 text-[0.85rem]">
                  <div className="font-mono text-[0.7rem] text-muted">{r.kode}</div>
                  <div>
                    <div className="font-semibold">{r.nama}</div>
                    {r.kota && <div className="mt-0.5 font-mono text-[0.7rem] text-muted">{r.kota}</div>}
                  </div>
                  <div className="font-mono text-[0.75rem] text-muted">{r.orderCount} order</div>
                  <div className="text-right font-bold">{rupiahCompact(r.nilaiBelanja)}</div>
                  <div className={`text-right font-bold ${r.piutang > 0 ? "text-accent" : "text-muted/40"}`}>
                    {r.piutang > 0 ? rupiahCompact(r.piutang) : "0"}
                  </div>
                  <div className="text-right">
                    <RowActionLink href={`/pelanggan/${r._id}`}>Riwayat</RowActionLink>
                  </div>
                </div>
              ))}
              {filteredRows.length === 0 && (
                <div className="border-b border-line py-10 text-center font-mono text-sm text-muted">{emptyMessage}</div>
              )}
            </div>
          </div>

          <div>
            <div className="border-b-2 border-ink pb-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
              Perlu ditelepon minggu ini
            </div>
            {summary.perluDitelepon.map((r) => (
              <div key={r._id} className="border-b border-line py-3">
                <div className="font-sans text-[0.8rem] font-semibold">{r.nama}</div>
                <div className="mt-1 font-mono text-[0.7rem] text-muted">
                  {r.kebiasaanBayar === "lewat"
                    ? `${rupiahCompact(r.piutang)} lewat ${r.hariTerlambat} hari`
                    : `Biasa pesan rutin, ${r.hariSejakOrderTerakhir} hari diam`}
                </div>
              </div>
            ))}
            {summary.perluDitelepon.length === 0 && (
              <div className="border-b border-line py-4 font-mono text-[0.75rem] text-muted">
                Tidak ada yang perlu ditindaklanjuti minggu ini. 🎉
              </div>
            )}

            <div className="mt-6 border-b-2 border-ink pb-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
              Kota terbesar
            </div>
            {summary.kotaTerbesar.map((k) => (
              <div key={k.kota} className="flex items-center justify-between border-b border-line py-2.5 font-sans text-[0.8rem]">
                <span>{k.kota}</span>
                <b>{k.count} pelanggan</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
