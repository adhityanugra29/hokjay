import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { getSession } from "@/lib/auth/session";
import { isKomisiSayaAllowed } from "@/lib/auth/access";
import { currentPeriod, getMyCommissionSummary, getSalesRanking } from "@/lib/insentif";
import { rupiah } from "@/lib/format";
import { MONTH_NAMES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * "Komisi Saya" — a Sales rep's own commission for the running period
 * ("9b" in the mobile mockup doc the user supplied 2026-08-26). Separate
 * page from /insentif (the full multi-sales leaderboard, Owner+Super Admin
 * only) — gated via isKomisiSayaAllowed (lib/auth/access.ts), which is also
 * what the nav uses to decide whether to show this link at all, so the two
 * always agree on who's let in (fixed 2026-08-28: this used to hard-check
 * role === "sales" only, so a "manager" — allowed by isKomisiSayaAllowed
 * and shown the nav link — hit a 404 here instead). "Sudah aman" /
 * "Tertahan" is split by whether the *customer* has paid the invoice yet
 * (status), not by komisiCair (whether the company has disbursed to the
 * sales rep — that's Payroll's own domain, see getMyCommissionSummary's doc
 * comment in lib/insentif.ts).
 */
export default async function KomisiSayaPage() {
  const session = await getSession();
  if (!session || !isKomisiSayaAllowed(session.role)) notFound();

  const period = currentPeriod();
  const [summary, ranking] = await Promise.all([
    getMyCommissionSummary(session.nama, period),
    getSalesRanking(period),
  ]);

  const [y, m] = period.split("-").map(Number);
  const periodLabel = `${MONTH_NAMES[m - 1]} ${y}`;

  const myRankIndex = ranking.findIndex((r) => r.salesNama === session.nama);
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : null;
  // Top 3, plus my own row tacked on if I'm outside it — matches the
  // mockup's "3 rows, mine highlighted" mini leaderboard.
  const topRows = ranking.slice(0, 3).map((r, i) => ({ ...r, _rank: i + 1 }));
  const boardRows =
    myRankIndex >= 0 && myRankIndex >= 3
      ? [...topRows, { ...ranking[myRankIndex], _rank: myRankIndex + 1 }]
      : topRows;

  return (
    <>
      <PageHeader title="Komisi Saya" subtitle={`Komisi berjalan periode ${periodLabel} — berdasarkan invoice yang sudah lunas.`} />
      <div className="p-6 md:p-9">
        <div className="border-2 border-ink bg-panel p-6">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Komisi berjalan · {periodLabel}
          </div>
          <div className="mt-1.5 font-sans text-[2rem] font-extrabold tracking-tight">
            {rupiah(summary.totalBerjalan)}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="border border-ink px-4 py-3">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                Sudah aman
              </div>
              <div className="mt-1 font-sans text-[1.25rem] font-extrabold">{rupiah(summary.sudahAman)}</div>
              <div className="mt-0.5 font-sans text-[0.7rem] text-muted">Invoice sudah lunas</div>
            </div>
            <div className="border border-accent px-4 py-3">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
                Tertahan
              </div>
              <div className="mt-1 font-sans text-[1.25rem] font-extrabold text-accent">{rupiah(summary.tertahan)}</div>
              <div className="mt-0.5 font-sans text-[0.7rem] text-muted">Menunggu pelanggan bayar</div>
            </div>
          </div>
        </div>

        {summary.tertahanInvoices.length > 0 && (
          <div className="mt-7">
            <div className="mb-1 flex items-center gap-2.5">
              <span className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.14em] text-accent">
                Tertahan karena belum dibayar
              </span>
              <span className="h-0.5 flex-1 bg-accent" />
            </div>
            {summary.tertahanInvoices.map((inv) => (
              <div
                key={inv.invoiceId}
                className="grid grid-cols-[64px_1fr_auto] items-center gap-4 border-b border-line py-4"
              >
                <div className="border-l-4 border-accent pl-2.5">
                  <div className="font-sans text-[1.15rem] font-extrabold leading-none text-accent">
                    {inv.hariBerjalan}
                  </div>
                  <div className="font-mono text-[9px] text-muted">hari</div>
                </div>
                <div>
                  <div className="font-sans text-[1rem] font-bold">{inv.customerNama}</div>
                  <div className="mt-0.5 font-mono text-[0.72rem] text-muted">{inv.nomor}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right font-sans text-[0.9rem] font-extrabold text-accent">
                    {rupiah(inv.komisi)}
                  </div>
                  <Link
                    href={`/invoice/${inv.invoiceId}`}
                    className="border border-accent bg-accent px-3 py-1.5 font-sans text-[0.72rem] font-bold text-white no-underline hover:bg-accent-600"
                  >
                    Tagih
                  </Link>
                </div>
              </div>
            ))}
            <div className="mt-2 font-sans text-[0.75rem] text-muted">
              Menagih invoice di atas melepas {rupiah(summary.tertahan)} komisi tertahan.
            </div>
          </div>
        )}

        <div className="mt-8">
          <div className="mb-1 flex items-center gap-2.5">
            <span className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.14em] text-muted">
              Papan peringkat {periodLabel}
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>
          {boardRows.map((r) => {
            const mine = r.salesNama === session.nama;
            return (
              <div
                key={r.salesNama}
                className={`grid grid-cols-[32px_1fr_auto] items-center gap-3 border-b border-line py-3 ${
                  mine ? "bg-accent/5" : ""
                }`}
              >
                <div className="font-sans text-[0.95rem] font-extrabold text-muted">#{r._rank}</div>
                <div className="font-sans text-[0.9rem] font-semibold">
                  {r.salesNama}
                  {mine && <span className="ml-1.5 font-sans text-[0.75rem] font-normal text-muted">— saya</span>}
                </div>
                <div className="font-sans text-[0.9rem] font-bold">{rupiah(r.totalKomisi)}</div>
              </div>
            );
          })}
          {boardRows.length === 0 && (
            <div className="py-6 text-center font-mono text-[0.8rem] text-muted">
              Belum ada komisi cair periode ini.
            </div>
          )}
          {myRank === null && ranking.length > 0 && (
            <div className="mt-2 font-sans text-[0.75rem] text-muted">
              Belum ada invoice lunas dari kamu periode ini — belum masuk papan peringkat.
            </div>
          )}
        </div>

        {summary.tertahanInvoices.length > 0 && (
          <Link
            href="/follow-up"
            className="mt-8 block w-full border border-accent bg-accent py-3.5 text-center font-sans text-[0.9rem] font-bold text-white no-underline hover:bg-accent-600 md:w-auto md:px-6"
          >
            Tagih yang tertahan
          </Link>
        )}
      </div>
    </>
  );
}
