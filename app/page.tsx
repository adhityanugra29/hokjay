import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import HotProductsCarousel from "@/components/dashboard/HotProductsCarousel";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { currentPeriod, getSalesRanking } from "@/lib/insentif";
import { getHotProducts } from "@/lib/dashboard";
import { rupiah, rupiahCompact, formatDateFull } from "@/lib/format";
import { currentJakartaMonthYear, jakartaMonthRange } from "@/lib/timezone";

export const dynamic = "force-dynamic";

function daysAgo(date: Date | string): number {
  const ms = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

function timeOfDay(date: Date | string): string {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function DashboardPage() {
  await dbConnect();
  const nowJakarta = currentJakartaMonthYear();
  const thisMonthRange = jakartaMonthRange(nowJakarta.year, nowJakarta.month);

  const [needsAction, ranking, hotProducts, recentInvoices, unpaidAll] = await Promise.all([
    Invoice.find({ status: { $in: ["unpaid", "draft"] } }).sort({ createdAt: 1 }).limit(6),
    getSalesRanking(currentPeriod()),
    getHotProducts(thisMonthRange),
    Invoice.find().sort({ updatedAt: -1 }).limit(5),
    Invoice.find({ status: "unpaid" }),
  ]);

  const piutangTotal = unpaidAll.reduce((s, i) => s + i.grandTotal, 0);
  const piutangTertua = unpaidAll.reduce(
    (max, i) => Math.max(max, daysAgo(i.tanggalInvoice ?? i.get("createdAt"))),
    0
  );

  const draftCount = needsAction.filter((i) => i.status === "draft").length;
  const unpaidCount = needsAction.filter((i) => i.status === "unpaid").length;

  return (
    <>
      <PageHeader
        title="Dasbor"
        subtitle={formatDateFull(new Date()).toUpperCase()}
        actions={<LinkButton href="/penjualan">Ayo Jualan →</LinkButton>}
      />

      <div className="grid md:grid-cols-[1fr_360px]">
        {/* Main column */}
        <section className="border-line p-6 md:border-r-2 md:p-9">
          <div className="mb-3.5 flex items-baseline justify-between gap-2.5">
            <h4 className="text-[1.05rem] font-extrabold">Follow-up Yuk</h4>
            <span className="font-sans text-[0.7rem] text-muted">
              {unpaidCount} belum lunas · {draftCount} draft
            </span>
          </div>
          <div className="mb-8">
            {needsAction.map((inv) => (
              <div
                key={String(inv._id)}
                className="grid grid-cols-[1fr_auto] items-center gap-4 border-t border-line py-3.5 last:border-b"
              >
                <div>
                  <div className="font-sans text-[0.95rem] font-bold">{inv.customer?.nama}</div>
                  <div className="mt-1 font-sans text-[0.75rem] text-muted">
                    {inv.nomor} ·{" "}
                    {inv.status === "draft"
                      ? `draft, dibuat ${daysAgo(inv.get("createdAt"))} hari lalu`
                      : `belum bayar, ${daysAgo(inv.tanggalInvoice ?? inv.get("createdAt"))} hari`}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="font-sans text-[0.95rem] font-extrabold">{rupiah(inv.grandTotal)}</div>
                  <Link
                    href={inv.status === "draft" ? `/invoice/${inv._id}/ubah` : `/invoice/${inv._id}`}
                    className="border border-accent px-3 py-1.5 font-sans text-[0.7rem] font-semibold text-accent no-underline hover:bg-accent hover:text-white"
                  >
                    {inv.status === "draft" ? "Lanjutkan" : "Lihat"}
                  </Link>
                </div>
              </div>
            ))}
            {needsAction.length === 0 && (
              <div className="border-t border-line py-8 text-center font-sans text-sm text-muted">
                Tidak ada invoice yang perlu ditindak.
              </div>
            )}
          </div>

          <div className="mb-3.5 flex items-baseline justify-between gap-2.5">
            <h4 className="text-[1.05rem] font-extrabold">Top Achiever</h4>
            <Link href="/insentif" className="font-sans text-[0.7rem] text-accent no-underline hover:underline">
              lihat semua →
            </Link>
          </div>
          <div>
            {ranking.slice(0, 3).map((r, i) => (
              <div key={r.salesNama} className="grid grid-cols-[32px_1fr_auto] items-baseline gap-3 border-t border-line py-2.5 last:border-b">
                <span className={`font-sans text-[0.7rem] font-extrabold ${i === 0 ? "text-accent" : "text-muted"}`}>
                  0{i + 1}
                </span>
                <span className="font-sans text-[0.85rem] font-bold">{r.salesNama}</span>
                <span className="font-sans text-[0.8rem]">{rupiah(r.totalKomisi)}</span>
              </div>
            ))}
            {ranking.length === 0 && (
              <div className="border-t border-line py-8 text-center font-sans text-sm text-muted">
                Belum ada komisi bulan ini.
              </div>
            )}
          </div>
        </section>

        {/* Aside */}
        <aside className="flex flex-col gap-7 p-6 md:p-7">
          <div>
            <h4 className="mb-3 text-[1.05rem] font-extrabold">Aktivitas terakhir</h4>
            <div className="flex flex-col gap-3.5">
              {recentInvoices.map((inv) => {
                const last = inv.riwayat?.[inv.riwayat.length - 1];
                return (
                  <div key={String(inv._id)} className="font-sans text-[0.8rem] leading-relaxed">
                    <span className="block font-sans text-[0.65rem] uppercase tracking-[0.08em] text-muted">
                      {timeOfDay(inv.get("updatedAt"))} · {inv.sales?.nama?.toUpperCase()}
                    </span>
                    {last?.keterangan ?? "Invoice diperbarui"} — {inv.nomor}
                  </div>
                );
              })}
              {recentInvoices.length === 0 && (
                <div className="font-sans text-[0.8rem] text-muted">Belum ada aktivitas.</div>
              )}
            </div>
          </div>

          <div className="mt-auto bg-surface p-4">
            <div className="mb-1.5 font-sans text-[0.68rem] uppercase tracking-[0.1em] text-accent">
              Piutang berjalan
            </div>
            <div className="font-sans text-[1.6rem] font-extrabold leading-none">
              {rupiahCompact(piutangTotal)}
            </div>
            <div className="mt-1.5 font-sans text-[0.7rem] text-muted">
              {unpaidAll.length} invoice{piutangTertua > 0 ? `, tertua ${piutangTertua} hari` : ""}
            </div>
          </div>
        </aside>
      </div>

      <section className="border-t-2 border-line p-6 md:p-9">
        <div className="mb-4 flex items-baseline justify-between gap-2.5">
          <h4 className="text-[1.05rem] font-extrabold">Hot Products</h4>
          <span className="font-sans text-[0.7rem] text-muted">
            Terlaris bulan ini · Stok terbanyak · Insentif tertinggi
          </span>
        </div>
        <HotProductsCarousel products={hotProducts} />
      </section>
    </>
  );
}
