import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import NavIcon from "@/components/layout/NavIcons";
import Logo from "@/components/layout/Logo";
import FollowUpStatusBadge from "@/components/dashboard/FollowUpStatusBadge";
import { dbConnect } from "@/lib/db";
import { currentPeriod, getSalesRanking, getMyCommissionSummary } from "@/lib/insentif";
import { getFollowUpInvoices, getLowStockProducts } from "@/lib/dashboard";
import { getMyDormantCustomers } from "@/lib/pelanggan";
import { getKeuanganSummary, getCurrentCashBalance } from "@/lib/keuangan";
import { getActivityLog } from "@/lib/activity";
import { getPurchasingSummary, getBayarTagihanSummary, getLowStockSuggestions } from "@/lib/purchasing";
import { getSession } from "@/lib/auth/session";
import { isAllowedPage } from "@/lib/auth/access";
import { rupiah, rupiahCompact } from "@/lib/format";
import { currentJakartaMonthYear, jakartaMonthRange } from "@/lib/timezone";
import { MONTH_NAMES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** Beranda — task-based homepage ("1a" in the 2026-08-22 redesign): three big actions, then a unified "needs action" list, numbers kept for last. Mobile gets its own "7a" layout below ("md:hidden" block) — a vertical priority list instead of the desktop's equal 3-card grid. */
export default async function DashboardPage() {
  await dbConnect();
  const session = await getSession();
  const role = session?.role ?? "sales";
  const nowJakarta = currentJakartaMonthYear();
  const thisMonthRange = jakartaMonthRange(nowJakarta.year, nowJakarta.month);

  const canSeePurchasing = isAllowedPage(role, "/purchasing");
  const canSeeBayarTagihan = isAllowedPage(role, "/bayar-tagihan");
  const isSales = role === "sales";

  const [
    followUpAll,
    ranking,
    lowStock,
    keuangan,
    activity,
    kasSekarang,
    purchasingSummary,
    bayarTagihanSummary,
    lowStockSuggestions,
    mySummary,
    myDormant,
  ] = await Promise.all([
    getFollowUpInvoices(),
    getSalesRanking(currentPeriod()),
    getLowStockProducts(3),
    getKeuanganSummary(thisMonthRange),
    getActivityLog(50),
    getCurrentCashBalance(),
    canSeePurchasing ? getPurchasingSummary() : null,
    canSeeBayarTagihan ? getBayarTagihanSummary() : null,
    getLowStockSuggestions(),
    isSales && session ? getMyCommissionSummary(session.nama, currentPeriod()) : null,
    isSales && session ? getMyDormantCustomers(session.nama, 3) : [],
  ]);
  const recentActivityCount = activity.filter((a) => Date.now() - a.tanggal.getTime() < 24 * 60 * 60 * 1000).length;

  const draftCount = followUpAll.filter((i) => i.status === "draft").length;
  const unpaidCount = followUpAll.filter((i) => i.status === "unpaid").length;
  const needsAction = followUpAll.slice(0, lowStock.length > 0 ? 5 : 6);
  const totalNeedsAction = followUpAll.length + (lowStock.length > 0 ? 1 : 0);

  const penjualanBulanIni = ranking.reduce((s, r) => s + r.totalPenjualan, 0);
  const belumTertagih = followUpAll.filter((i) => i.status === "unpaid").reduce((s, i) => s + i.sisaTagihan, 0);
  const insentifTerkumpul = ranking.reduce((s, r) => s + r.totalKomisi, 0);

  const lowStockNilai = lowStockSuggestions.reduce((s, p) => s + p.usulTotal, 0);

  // Sales rep's own numbers, derived from data already fetched above — no
  // extra queries needed. "Peringkat saya" reuses the same getSalesRanking
  // call the desktop leaderboard-adjacent stats use.
  const myUnpaid = followUpAll.filter((i) => i.status === "unpaid" && i.salesNama === session?.nama);
  const myDraft = followUpAll.filter((i) => i.status === "draft" && i.salesNama === session?.nama);
  const myRankIndex = ranking.findIndex((r) => r.salesNama === session?.nama);
  const myPenjualanBulanIni = ranking.find((r) => r.salesNama === session?.nama)?.totalPenjualan ?? 0;
  const myBelumTertagih = myUnpaid.reduce((s, i) => s + i.sisaTagihan, 0);

  // Desktop's "Perlu ditindak" list, Sales version — same three sources as
  // the mobile "9a" rows above, just shaped for the desktop card row
  // (FollowUpStatusBadge + a single action button) instead of the mobile
  // day-count/left-border row. Not capped to 5 like mobile since desktop
  // has the room to show all of it.
  const salesNeedsAction: {
    key: string;
    badgeStatus: "draft" | "unpaid" | "sepi";
    title: string;
    subtitle: string;
    actionLabel: string;
    actionHref: string;
  }[] = [
    ...myUnpaid.map((inv) => ({
      key: `inv-${inv.invoiceId}`,
      badgeStatus: "unpaid" as const,
      title: inv.customerNama,
      subtitle: `${inv.nomor} · ${rupiah(inv.sisaTagihan)} · ${inv.hariBerjalan} hari`,
      actionLabel: "Lihat",
      actionHref: `/invoice/${inv.invoiceId}`,
    })),
    ...myDraft.map((inv) => ({
      key: `draft-${inv.invoiceId}`,
      badgeStatus: "draft" as const,
      title: inv.customerNama,
      subtitle: `${inv.nomor} · ${rupiah(inv.grandTotal)} · belum dikirim`,
      actionLabel: "Lanjutkan",
      actionHref: `/invoice/${inv.invoiceId}/ubah`,
    })),
    ...myDormant.map((c) => ({
      key: `dormant-${c._id}`,
      badgeStatus: "sepi" as const,
      title: c.nama,
      subtitle: `${c.orderCount}x order sebelumnya · sudah ${c.hariSejakOrderTerakhir} hari sepi`,
      actionLabel: "Lihat",
      actionHref: `/pelanggan/${c._id}`,
    })),
  ];

  // "9a" mobile (Sales-only) — own unpaid invoices (oldest first, "Tagih"),
  // own drafts ("Lanjut"), own dormant customers ("Hubungi"). No sales-target
  // progress bar and no "Penawaran"/quote rows — neither concept exists in
  // the data model yet, skipped per the user's explicit confirmation
  // 2026-08-26 rather than inventing placeholder data.
  const salesUrgentRows: { key: string; title: string; subtitle: string; nilai?: number; href: string; urgent: boolean }[] = [
    ...myUnpaid.slice(0, 3).map((inv) => ({
      key: `inv-${inv.invoiceId}`,
      title: `${inv.customerNama} · ${inv.hariBerjalan} hari belum bayar`,
      subtitle: `${inv.nomor} · komisi ${rupiahCompact(inv.komisiPotensial)}`,
      nilai: inv.sisaTagihan,
      href: `/invoice/${inv.invoiceId}`,
      urgent: true,
    })),
    ...myDraft.slice(0, 2).map((inv) => ({
      key: `draft-${inv.invoiceId}`,
      title: `Draft ${inv.customerNama}`,
      subtitle: `${inv.nomor} · belum dikirim`,
      nilai: inv.grandTotal,
      href: `/invoice/${inv.invoiceId}/ubah`,
      urgent: false,
    })),
    ...myDormant.slice(0, 2).map((c) => ({
      key: `dormant-${c._id}`,
      title: `${c.nama} · sudah ${c.hariSejakOrderTerakhir} hari sepi`,
      subtitle: `${c.orderCount}x order sebelumnya`,
      href: `/pelanggan/${c._id}`,
      urgent: false,
    })),
  ].slice(0, 5);

  // "7a" mobile — up to 4 urgency rows, worst (red border) first, matching
  // the mockup's category set where the app actually has the data for it.
  const genericUrgentRows = [
    unpaidCount > 0
      ? {
          key: "invoice",
          title: `${unpaidCount} invoice menunggu dibayar`,
          subtitle: followUpAll.filter((i) => i.status === "unpaid").slice(0, 2).map((i) => i.customerNama).join(", ") + (unpaidCount > 2 ? `, +${unpaidCount - 2}` : ""),
          nilai: belumTertagih,
          href: "/follow-up",
          urgent: true,
        }
      : null,
    canSeePurchasing && purchasingSummary && purchasingSummary.poTelatCount > 0
      ? {
          key: "po",
          title: `${purchasingSummary.poTelatCount} PO telat datang`,
          subtitle: "Cek estimasi tiba di Purchasing",
          nilai: purchasingSummary.poTelatNilai,
          href: "/purchasing",
          urgent: true,
        }
      : null,
    lowStockSuggestions.length > 0
      ? {
          key: "stok",
          title: `${lowStockSuggestions.length} barang di bawah minimum`,
          subtitle: "Usulan PO sudah dihitung",
          nilai: lowStockNilai,
          href: "/purchasing",
          urgent: false,
        }
      : null,
    canSeeBayarTagihan && bayarTagihanSummary && bayarTagihanSummary.jatuhTempo7HariCount > 0
      ? {
          key: "tagihan",
          title: `${bayarTagihanSummary.jatuhTempo7HariCount} tagihan supplier ≤7 hari`,
          subtitle: `Kas tersedia ${rupiahCompact(bayarTagihanSummary.kasTersedia)}`,
          nilai: bayarTagihanSummary.jatuhTempo7HariNilai,
          href: "/bayar-tagihan",
          urgent: false,
        }
      : null,
  ].filter((r): r is NonNullable<typeof r> => r !== null);

  const mobileUrgentRows = isSales ? salesUrgentRows : genericUrgentRows;

  return (
    <>
      {/* ───────── Mobile — "7a" ───────── */}
      <div className="md:hidden">
        <div className="bg-ink px-4 pb-4 pt-3 text-panel">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Logo tone="white" size="sm" />
              <div className="mt-2 font-sans text-[0.7rem] text-white/50">
                {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
                {session?.nama ? ` · ${session.nama}` : ""}
              </div>
            </div>
            <Link
              href="/aktivitas"
              title="Aktivitas"
              className="relative -mr-1.5 -mt-1 flex h-11 w-11 items-center justify-center text-white"
            >
              <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <path d="M10 3a5 5 0 0 1 5 5v3l1.5 3H3.5L5 11V8a5 5 0 0 1 5-5zM8 17h4" />
              </svg>
              {recentActivityCount > 0 && (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 bg-accent" />
              )}
            </Link>
          </div>
        </div>

        <div className="flex flex-col">
          <Link
            href="/katalog"
            className="flex min-h-[44px] items-center justify-between gap-3 bg-accent px-4 py-[18px] text-white no-underline"
          >
            <span>
              <span className="block font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
                Paling sering
              </span>
              <b className="mt-1.5 block font-sans text-[1.15rem] tracking-tight">Katalog</b>
            </span>
            <NavIcon name="chevron-right" size={22} />
          </Link>
          <Link
            href="/invoice"
            className="flex min-h-[44px] items-center justify-between gap-3 border-b border-line bg-white px-4 py-4 no-underline"
          >
            <span>
              <b className="block font-sans text-[0.95rem] tracking-tight text-ink">
                {isSales ? "Invoice Saya" : "Terima Pembayaran"}
              </b>
              <span className="mt-0.5 block font-sans text-[0.72rem] text-muted">
                {isSales ? myUnpaid.length : unpaidCount} invoice menunggu
              </span>
            </span>
            <NavIcon name="chevron-right" size={20} />
          </Link>
          {isSales ? (
            <Link
              href="/komisi-saya"
              className="flex min-h-[44px] items-center justify-between gap-3 border-b-2 border-ink bg-white px-4 py-4 no-underline"
            >
              <span>
                <b className="block font-sans text-[0.95rem] tracking-tight text-ink">Komisi Saya</b>
                <span className="mt-0.5 block font-sans text-[0.72rem] text-muted">
                  Berjalan bulan ini {rupiah(mySummary?.totalBerjalan ?? 0)}
                </span>
              </span>
              <NavIcon name="chevron-right" size={20} />
            </Link>
          ) : (
            <Link
              href="/keuangan/transaksi"
              className="flex min-h-[44px] items-center justify-between gap-3 border-b-2 border-ink bg-white px-4 py-4 no-underline"
            >
              <span>
                <b className="block font-sans text-[0.95rem] tracking-tight text-ink">Catat Pengeluaran</b>
                <span className="mt-0.5 block font-sans text-[0.72rem] text-muted">Kas sekarang {rupiah(kasSekarang)}</span>
              </span>
              <NavIcon name="chevron-right" size={20} />
            </Link>
          )}
        </div>

        <div className="flex items-baseline justify-between px-4 pb-2 pt-[18px]">
          <span className="font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
            {isSales ? "Dikejar hari ini" : "Perlu diurus hari ini"}
          </span>
          <span className="font-sans text-[11px] font-bold text-accent">{mobileUrgentRows.length} hal</span>
        </div>
        <div className="flex flex-col">
          {mobileUrgentRows.map((row, i) => (
            <Link
              key={row.key}
              href={row.href}
              className={`flex items-center justify-between gap-2.5 border-t border-line py-3.5 pl-3 pr-4 no-underline ${
                row.urgent ? "border-l-4 border-l-accent" : "border-l-4 border-l-line"
              } ${i === mobileUrgentRows.length - 1 ? "border-b-2 border-b-ink" : ""}`}
            >
              <span>
                <b className="block font-sans text-[0.85rem] text-ink">{row.title}</b>
                <span className="mt-0.5 block font-sans text-[0.72rem] text-muted">{row.subtitle}</span>
              </span>
              {row.nilai !== undefined && (
                <b className="whitespace-nowrap font-sans text-[0.82rem] tracking-tight text-ink">{rupiahCompact(row.nilai)}</b>
              )}
            </Link>
          ))}
          {mobileUrgentRows.length === 0 && (
            <div className="border-t border-line py-8 text-center font-sans text-[0.85rem] text-muted">
              Tidak ada yang perlu ditindak. 🎉
            </div>
          )}
        </div>

        {isSales ? (
          <div className="grid grid-cols-3 border-t border-line bg-white">
            <div className="border-r border-line px-3 py-3.5">
              <div className="font-sans text-[9.5px] font-bold uppercase tracking-[0.13em] text-muted">Komisi</div>
              <div className="mt-1 font-sans text-[1.05rem] font-extrabold tracking-tight">
                {rupiahCompact(mySummary?.totalBerjalan ?? 0)}
              </div>
            </div>
            <div className="border-r border-line px-3 py-3.5">
              <div className="font-sans text-[9.5px] font-bold uppercase tracking-[0.13em] text-muted">Order jalan</div>
              <div className="mt-1 font-sans text-[1.05rem] font-extrabold tracking-tight">
                {myUnpaid.length + myDraft.length}
              </div>
            </div>
            <div className="px-3 py-3.5">
              <div className="font-sans text-[9.5px] font-bold uppercase tracking-[0.13em] text-muted">Peringkat</div>
              <div className="mt-1 font-sans text-[1.05rem] font-extrabold tracking-tight">
                {myRankIndex >= 0 ? `#${myRankIndex + 1} dari ${ranking.length}` : "—"}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 border-t border-line bg-white">
            <div className="border-r border-line px-4 py-3.5">
              <div className="font-sans text-[9.5px] font-bold uppercase tracking-[0.13em] text-muted">Kas sekarang</div>
              <div className="mt-1 font-sans text-[1.15rem] font-extrabold tracking-tight">{rupiahCompact(kasSekarang)}</div>
            </div>
            <div className="px-4 py-3.5">
              <div className="font-sans text-[9.5px] font-bold uppercase tracking-[0.13em] text-muted">
                Penjualan {MONTH_NAMES[nowJakarta.month - 1]}
              </div>
              <div className="mt-1 font-sans text-[1.15rem] font-extrabold tracking-tight">{rupiahCompact(penjualanBulanIni)}</div>
            </div>
          </div>
        )}
      </div>

      {/* ───────── Desktop ───────── */}
      <div className="hidden md:block">
        <PageHeader
          title="Beranda"
          subtitle="Titik awal setiap hari. Pilih satu aksi di bawah, atau bereskan daftar yang perlu ditindak."
          actions={
            <Link
              href="/aktivitas"
              title="Aktivitas"
              className="relative flex h-9 w-9 items-center justify-center border border-line text-ink hover:border-accent hover:text-accent"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <path d="M10 3a5 5 0 0 1 5 5v3l1.5 3H3.5L5 11V8a5 5 0 0 1 5-5zM8 17h4" />
              </svg>
              {recentActivityCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 bg-accent px-1 text-[9.5px] font-bold text-white">
                  {recentActivityCount}
                </span>
              )}
            </Link>
          }
        />

        <div className="px-6 pt-7 md:px-9">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <Link
              href="/katalog"
              className="flex min-h-[132px] flex-col bg-accent p-5 text-white no-underline hover:bg-accent-600"
            >
              <NavIcon name="cart" size={20} />
              <div className="mt-auto">
                <div className="font-sans text-[1.2rem] font-extrabold tracking-tight">Jual barang</div>
                <div className="mt-1 font-sans text-[0.75rem] text-white/85">Jelajahi katalog → buat invoice</div>
              </div>
            </Link>
            <Link
              href="/invoice"
              className="flex min-h-[132px] flex-col border-2 border-ink bg-panel p-5 no-underline hover:border-accent"
            >
              <div className="flex items-start justify-between">
                <NavIcon name="document" size={20} />
                {(isSales ? myUnpaid.length + myDraft.length : unpaidCount + draftCount) > 0 && (
                  <span className="bg-ink px-1.5 py-0.5 text-[10.5px] font-bold text-white">
                    {isSales ? myUnpaid.length + myDraft.length : unpaidCount + draftCount} nunggu
                  </span>
                )}
              </div>
              <div className="mt-auto">
                <div className="font-sans text-[1.2rem] font-extrabold tracking-tight text-ink">
                  {isSales ? "Invoice saya" : "Tagih invoice"}
                </div>
                <div className="mt-1 font-sans text-[0.75rem] text-muted">
                  {isSales ? myUnpaid.length : unpaidCount} belum bayar · {isSales ? myDraft.length : draftCount} draft belum dikirim
                </div>
              </div>
            </Link>
            {isSales ? (
              <Link
                href="/komisi-saya"
                className="flex min-h-[132px] flex-col border border-line bg-panel p-5 no-underline hover:border-accent"
              >
                <NavIcon name="trophy" size={20} />
                <div className="mt-auto">
                  <div className="font-sans text-[1.2rem] font-extrabold tracking-tight text-ink">Komisi saya</div>
                  <div className="mt-1 font-sans text-[0.75rem] text-muted">
                    Berjalan bulan ini {rupiah(mySummary?.totalBerjalan ?? 0)}
                  </div>
                </div>
              </Link>
            ) : (
              <Link
                href="/keuangan/transaksi"
                className="flex min-h-[132px] flex-col border border-line bg-panel p-5 no-underline hover:border-accent"
              >
                <NavIcon name="cashbox" size={20} />
                <div className="mt-auto">
                  <div className="font-sans text-[1.2rem] font-extrabold tracking-tight text-ink">Catat uang</div>
                  <div className="mt-1 font-sans text-[0.75rem] text-muted">Pemasukan atau pengeluaran toko</div>
                </div>
              </Link>
            )}
          </div>
        </div>

        <div className="px-6 pt-8 pb-6 md:px-9">
          <div className="flex items-baseline justify-between gap-2.5 border-b-2 border-ink pb-2.5">
            <div className="font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
              {isSales ? "Dikejar hari ini" : "Perlu ditindak"} — {isSales ? salesNeedsAction.length : totalNeedsAction} hal
            </div>
            {!isSales && (
              <Link href="/follow-up" className="font-sans text-[0.75rem] text-accent no-underline hover:underline">
                lihat semua →
              </Link>
            )}
          </div>

          {isSales
            ? salesNeedsAction.map((row) => (
                <div key={row.key} className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-line py-3.5">
                  <div className="flex items-center gap-3">
                    <FollowUpStatusBadge status={row.badgeStatus} />
                    <div>
                      <div className="font-sans text-[0.95rem] font-bold">{row.title}</div>
                      <div className="mt-0.5 font-sans text-[0.75rem] text-muted">{row.subtitle}</div>
                    </div>
                  </div>
                  <Link
                    href={row.actionHref}
                    className="border border-accent px-3 py-1.5 font-sans text-[0.7rem] font-semibold text-accent no-underline hover:bg-accent hover:text-white"
                  >
                    {row.actionLabel}
                  </Link>
                </div>
              ))
            : needsAction.map((inv) => (
                <div
                  key={inv.invoiceId}
                  className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-line py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <FollowUpStatusBadge status={inv.status} />
                    <div>
                      <div className="font-sans text-[0.95rem] font-bold">{inv.customerNama}</div>
                      <div className="mt-0.5 font-sans text-[0.75rem] text-muted">
                        {inv.nomor} · {rupiah(inv.sisaTagihan)} · sales {inv.salesNama}
                      </div>
                    </div>
                  </div>
                  <Link
                    href={inv.status === "draft" ? `/invoice/${inv.invoiceId}/ubah` : `/invoice/${inv.invoiceId}`}
                    className="border border-accent px-3 py-1.5 font-sans text-[0.7rem] font-semibold text-accent no-underline hover:bg-accent hover:text-white"
                  >
                    {inv.status === "draft" ? "Lanjutkan" : "Lihat"}
                  </Link>
                </div>
              ))}

          {/* Stok tipis — not shown to Sales, who has no Inventory access. */}
          {!isSales && lowStock.length > 0 && (
            <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-line py-3.5">
              <div className="flex items-center gap-3">
                <span className="border border-line px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide text-muted">
                  Stok
                </span>
                <div>
                  <div className="font-sans text-[0.95rem] font-bold">
                    {lowStock.length} produk stoknya menipis
                  </div>
                  <div className="mt-0.5 font-sans text-[0.75rem] text-muted">
                    {lowStock.map((p) => p.name).join(" · ")}
                  </div>
                </div>
              </div>
              <Link
                href="/produk"
                className="border border-line px-3 py-1.5 font-sans text-[0.7rem] font-semibold text-ink no-underline hover:border-accent hover:text-accent"
              >
                Lihat inventory
              </Link>
            </div>
          )}

          {isSales
            ? salesNeedsAction.length === 0 && (
                <div className="border-b border-line py-8 text-center font-sans text-sm text-muted">
                  Tidak ada yang perlu ditindak. 🎉
                </div>
              )
            : needsAction.length === 0 &&
              lowStock.length === 0 && (
                <div className="border-b border-line py-8 text-center font-sans text-sm text-muted">
                  Tidak ada yang perlu ditindak. 🎉
                </div>
              )}
        </div>

        <div className="grid grid-cols-2 gap-6 border-t-2 border-ink bg-panel px-6 py-5 md:grid-cols-4 md:px-9">
          <div>
            <div className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Penjualan {MONTH_NAMES[nowJakarta.month - 1]}
            </div>
            <div className="mt-1 font-sans text-[1.35rem] font-extrabold tracking-tight">
              {rupiahCompact(isSales ? myPenjualanBulanIni : penjualanBulanIni)}
            </div>
          </div>
          <div>
            <div className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Belum tertagih
            </div>
            <div className="mt-1 font-sans text-[1.35rem] font-extrabold tracking-tight text-accent">
              {rupiahCompact(isSales ? myBelumTertagih : belumTertagih)}
            </div>
          </div>
          {isSales ? (
            <div>
              <div className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Peringkat</div>
              <div className="mt-1 font-sans text-[1.35rem] font-extrabold tracking-tight">
                {myRankIndex >= 0 ? `#${myRankIndex + 1} dari ${ranking.length}` : "—"}
              </div>
            </div>
          ) : (
            <div>
              <div className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                Kas bersih bulan ini
              </div>
              <div className="mt-1 font-sans text-[1.35rem] font-extrabold tracking-tight">
                {rupiahCompact(keuangan.netTotal)}
              </div>
            </div>
          )}
          <div>
            <div className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Komisi {isSales ? "saya (berjalan)" : "terkumpul"}
            </div>
            <div className="mt-1 font-sans text-[1.35rem] font-extrabold tracking-tight">
              {rupiahCompact(isSales ? (mySummary?.totalBerjalan ?? 0) : insentifTerkumpul)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
