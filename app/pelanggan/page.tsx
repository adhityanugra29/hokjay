import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { RowActionLink } from "@/components/ui/RowAction";
import { getPelangganSummary } from "@/lib/pelanggan";
import { rupiah, rupiahCompact } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Pelanggan — "daftar prioritas" per the 2026-08-22 redesign ("3b"): piutang, kebiasaan bayar, dan siapa mulai jarang pesan, bukan buku alamat datar. */
export default async function PelangganPage({ searchParams }: PageProps<"/pelanggan">) {
  const sp = await searchParams;
  const filter = sp.filter === "piutang" || sp.filter === "jarang" ? sp.filter : "semua";
  const summary = await getPelangganSummary();

  const filteredRows = summary.rows.filter((r) => {
    if (filter === "piutang") return r.piutang > 0;
    if (filter === "jarang") return r.orderCount >= 2 && (r.hariSejakOrderTerakhir ?? 0) > 60;
    return true;
  });

  const KEBIASAAN_COLOR: Record<string, string> = {
    "tepat-waktu": "text-muted",
    tempo: "text-muted",
    lewat: "text-accent",
    "belum-pernah": "text-muted/60",
  };

  return (
    <>
      <PageHeader
        title="Pelanggan"
        subtitle="Bukan buku alamat. Yang dilihat duluan: siapa masih punya utang, siapa mulai jarang pesan, siapa layak diprioritaskan."
        actions={<LinkButton href="/pelanggan/baru">+ Pelanggan baru</LinkButton>}
      />
      <div className="p-6 md:p-9">
        <div className="mb-6 grid grid-cols-2 border-2 border-ink bg-panel lg:grid-cols-4">
          <div className="min-w-0 border-b border-r border-line p-4 sm:p-4.5 lg:border-b-0">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Pelanggan aktif
            </div>
            <div className="mt-1.5 font-sans text-[1.15rem] font-extrabold sm:text-[1.3rem]">{summary.pelangganAktif}</div>
            <div className="mt-1 font-mono text-[0.68rem] text-muted">pesan dalam 90 hari</div>
          </div>
          <div className="min-w-0 border-b border-line p-4 sm:p-4.5 lg:border-b-0 lg:border-r">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Total piutang
            </div>
            <div className="mt-1.5 font-sans text-[1.05rem] font-extrabold text-accent sm:whitespace-nowrap sm:text-[1.3rem]">
              {rupiah(summary.totalPiutang)}
            </div>
            <div className="mt-1 font-mono text-[0.68rem] text-muted">tersebar di {summary.piutangCustomerCount} pelanggan</div>
          </div>
          <div className="min-w-0 border-r border-line p-4 sm:p-4.5">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Lewat jatuh tempo
            </div>
            <div className="mt-1.5 font-sans text-[1.15rem] font-extrabold sm:text-[1.3rem]">{summary.lewatJatuhTempoCount} pelanggan</div>
            <div className="mt-1 font-mono text-[0.68rem] text-muted">senilai {rupiahCompact(summary.lewatJatuhTempoTotal)}</div>
          </div>
          <div className="min-w-0 bg-ink p-4 text-white sm:p-4.5">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
              Mulai jarang pesan
            </div>
            <div className="mt-1.5 font-sans text-[1.15rem] font-extrabold sm:text-[1.3rem]">{summary.jarangPesanCount} pelanggan</div>
            <div className="mt-1 font-mono text-[0.68rem] text-white/55">biasa rutin, kini &gt;60 hari diam</div>
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
                <Link
                  href="/pelanggan?filter=jarang"
                  className={`border px-2.5 py-1.5 font-mono text-[0.7rem] ${filter === "jarang" ? "border-ink bg-ink text-white" : "border-line text-ink hover:border-accent"}`}
                >
                  Jarang pesan
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-[1.5fr_70px_105px_100px_120px_60px] gap-3.5 border-b border-line py-2.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted">
              <span>Pelanggan</span>
              <span>Frekuensi</span>
              <span className="text-right">Nilai belanja</span>
              <span className="text-right">Piutang</span>
              <span>Kebiasaan bayar</span>
              <span />
            </div>
            {filteredRows.map((r) => (
              <div key={r._id} className="grid grid-cols-[1.5fr_70px_105px_100px_120px_60px] items-center gap-3.5 border-b border-line py-3.5 text-[0.85rem]">
                <div>
                  <div className="font-semibold">{r.nama}</div>
                  {r.kota && <div className="mt-0.5 font-mono text-[0.7rem] text-muted">{r.kota}</div>}
                </div>
                <div className="font-mono text-[0.75rem] text-muted">{r.orderCount} order</div>
                <div className="text-right font-bold">{rupiahCompact(r.nilaiBelanja)}</div>
                <div className={`text-right font-bold ${r.piutang > 0 ? "text-accent" : "text-muted/40"}`}>
                  {r.piutang > 0 ? rupiahCompact(r.piutang) : "0"}
                </div>
                <div className={`font-mono text-[0.7rem] font-bold uppercase tracking-wide ${KEBIASAAN_COLOR[r.kebiasaanBayar]}`}>
                  {r.kebiasaanBayarLabel}
                </div>
                <div className="text-right">
                  <RowActionLink href={`/pelanggan/${r._id}`}>Riwayat</RowActionLink>
                </div>
              </div>
            ))}
            {filteredRows.length === 0 && (
              <div className="border-b border-line py-10 text-center font-mono text-sm text-muted">
                {filter === "semua" ? (
                  <>
                    Belum ada pelanggan.{" "}
                    <Link href="/pelanggan/baru" className="text-accent underline underline-offset-2">
                      Tambah pelanggan pertama
                    </Link>
                    .
                  </>
                ) : (
                  "Tidak ada pelanggan yang cocok dengan filter ini."
                )}
              </div>
            )}
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
