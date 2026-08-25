import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { SearchInput } from "@/components/ui/Panel";
import { LinkButton } from "@/components/ui/Button";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { rupiah, formatDateShort } from "@/lib/format";
import { currentJakartaMonthYear, jakartaMonthRange } from "@/lib/timezone";
import { MONTH_NAMES } from "@/lib/constants";

export const dynamic = "force-dynamic";

function hariBerjalan(from: Date | string) {
  return Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 86_400_000));
}

/** Invoice list — grouped by status instead of one flat table ("1c" in the 2026-08-22 redesign). */
export default async function InvoiceListPage({ searchParams }: PageProps<"/invoice">) {
  const sp = await searchParams;
  const { search } = sp;
  await dbConnect();

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { nomor: { $regex: search, $options: "i" } },
      { "customer.nama": { $regex: search, $options: "i" } },
    ];
  }
  const invoices = await Invoice.find(filter).sort({ createdAt: -1 });

  const unpaid = invoices
    .filter((i) => i.status === "unpaid")
    .sort((a, b) => hariBerjalan(a.tanggalInvoice ?? a.get("createdAt")) < hariBerjalan(b.tanggalInvoice ?? b.get("createdAt")) ? 1 : -1);
  const draft = invoices.filter((i) => i.status === "draft");
  const paid = invoices.filter((i) => i.status === "paid");

  const nowJakarta = currentJakartaMonthYear();
  const thisMonth = jakartaMonthRange(nowJakarta.year, nowJakarta.month);
  const paidThisMonth = paid.filter((i) => {
    const t = new Date(i.tanggalInvoice ?? i.get("createdAt"));
    return t >= thisMonth.from && t < thisMonth.to;
  });

  const totalPiutang = unpaid.reduce((s, i) => s + i.grandTotal, 0);

  return (
    <>
      <PageHeader
        title="Invoice"
        subtitle="Semua tagihan ke pelanggan. Draft belum memotong stok; begitu dikirim, stok dan insentif langsung dihitung."
        actions={<LinkButton href="/katalog">+ Belanja / Buat Invoice</LinkButton>}
      />
      <div className="p-6 md:p-9">
        <div className="mb-6 flex flex-wrap items-stretch border-2 border-ink bg-panel">
          <div className="border-r border-line bg-ink px-6 py-3.5 text-white">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
              Perlu ditindak
            </div>
            <div className="mt-0.5 font-sans text-[1.25rem] font-extrabold">{unpaid.length + draft.length}</div>
          </div>
          <div className="border-r border-line px-6 py-3.5">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Belum bayar
            </div>
            <div className="mt-0.5 font-sans text-[1.25rem] font-extrabold">{unpaid.length}</div>
          </div>
          <div className="border-r border-line px-6 py-3.5">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Draft</div>
            <div className="mt-0.5 font-sans text-[1.25rem] font-extrabold">{draft.length}</div>
          </div>
          <div className="px-6 py-3.5">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Lunas {MONTH_NAMES[nowJakarta.month - 1]}
            </div>
            <div className="mt-0.5 font-sans text-[1.25rem] font-extrabold">{paidThisMonth.length}</div>
          </div>
          <form className="ml-auto flex items-center px-4 py-3.5">
            <SearchInput name="search" defaultValue={search as string} placeholder="Cari no. invoice atau pelanggan..." />
          </form>
        </div>

        {/* Belum dibayar */}
        <div className="mb-1 flex items-center gap-2.5">
          <span className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.14em] text-accent">
            Belum dibayar
          </span>
          <span className="h-0.5 flex-1 bg-accent" />
          {totalPiutang > 0 && (
            <span className="font-mono text-[0.72rem] text-muted">{rupiah(totalPiutang)} tertahan</span>
          )}
        </div>
        {unpaid.map((inv) => {
          const hari = hariBerjalan(inv.tanggalInvoice ?? inv.get("createdAt"));
          const komisi = inv.items.reduce((s, i) => s + i.komisiSubtotal, 0);
          return (
            <div key={String(inv._id)} className="grid grid-cols-[64px_1fr_auto] items-center gap-4 border-b border-line py-4">
              <div className="border-l-4 border-accent pl-2.5">
                <div className="font-sans text-[1.15rem] font-extrabold leading-none text-accent">{hari}</div>
                <div className="font-mono text-[9px] text-muted">hari</div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-sans text-[1rem] font-bold">{inv.customer?.nama ?? "—"}</span>
                  {inv.dp?.nominal ? (
                    <span className="border border-gold px-1.5 py-0.5 font-mono text-[0.62rem] font-bold text-gold">
                      Sudah DP {Math.round((inv.dp.nominal / inv.grandTotal) * 100)}%
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 font-mono text-[0.72rem] text-muted">
                  {inv.nomor} · {formatDateShort(inv.tanggalInvoice ?? inv.get("createdAt"))} · sales {inv.sales?.nama} ·{" "}
                  {inv.items.length} item{inv.kurir ? ` · kirim via ${inv.kurir}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-sans text-[1rem] font-extrabold">{rupiah(inv.grandTotal)}</div>
                  <div className="font-mono text-[0.68rem] text-muted">insentif {rupiah(komisi)}</div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`https://wa.me/${(inv.customer?.whatsapp ?? "").replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="border border-line px-3 py-1.5 font-sans text-[0.72rem] font-semibold text-ink no-underline hover:border-accent hover:text-accent"
                  >
                    Kirim WA
                  </a>
                  <Link
                    href={`/invoice/${inv._id}/ubah`}
                    className="border border-line px-3 py-1.5 font-sans text-[0.72rem] font-semibold text-ink no-underline hover:border-accent hover:text-accent"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/invoice/${inv._id}`}
                    className="border border-accent bg-accent px-3 py-1.5 font-sans text-[0.72rem] font-bold text-white no-underline hover:bg-accent-600"
                  >
                    Tandai lunas
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
        {unpaid.length === 0 && (
          <div className="border-b border-line py-6 text-center font-mono text-[0.8rem] text-muted">
            Tidak ada invoice belum dibayar.
          </div>
        )}

        {/* Draft */}
        <div className="mb-1 mt-7 flex items-center gap-2.5">
          <span className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.14em] text-muted">
            Draft — belum dikirim, stok belum dipotong
          </span>
          <span className="h-px flex-1 bg-line" />
        </div>
        {draft.map((inv) => (
          <div key={String(inv._id)} className="grid grid-cols-[64px_1fr_auto] items-center gap-4 border-b border-line py-4">
            <div className="border-l-4 border-line pl-2.5">
              <div className="font-mono text-[0.72rem] font-bold text-muted">DRAFT</div>
              <div className="font-mono text-[9px] text-muted">
                {hariBerjalan(inv.get("createdAt"))} hari
              </div>
            </div>
            <div>
              <div className="font-sans text-[1rem] font-bold">{inv.customer?.nama ?? "—"}</div>
              <div className="mt-0.5 font-mono text-[0.72rem] text-muted">
                {inv.nomor} · sales {inv.sales?.nama} · {inv.items.length} item
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="font-sans text-[1rem] font-extrabold">{rupiah(inv.grandTotal)}</div>
                <div className="font-mono text-[0.68rem] text-muted">estimasi</div>
              </div>
              <Link
                href={`/invoice/${inv._id}/ubah`}
                className="border border-accent bg-accent px-3 py-1.5 font-sans text-[0.72rem] font-bold text-white no-underline hover:bg-accent-600"
              >
                Lanjutkan
              </Link>
            </div>
          </div>
        ))}
        {draft.length === 0 && (
          <div className="border-b border-line py-6 text-center font-mono text-[0.8rem] text-muted">
            Tidak ada draft.
          </div>
        )}

        {/* Sudah lunas */}
        <div className="mb-1 mt-7 flex items-center gap-2.5">
          <span className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.14em] text-muted">
            Sudah lunas — {paid.length} invoice
          </span>
          <span className="h-px flex-1 bg-line" />
        </div>
        {paid.map((inv) => (
          <div key={String(inv._id)} className="grid grid-cols-[64px_1fr_auto] items-center gap-4 border-b border-line py-3 text-ink/75">
            <div className="pl-2.5 font-mono text-[0.7rem] text-muted">
              {formatDateShort(inv.tanggalInvoice ?? inv.get("createdAt"))}
            </div>
            <div className="font-sans text-[0.9rem] font-semibold">
              {inv.customer?.nama ?? "—"}{" "}
              <span className="font-mono text-[0.72rem] font-normal text-muted">
                · {inv.nomor} · {inv.sales?.nama}
              </span>
            </div>
            <div className="font-sans text-[0.9rem] font-bold">{rupiah(inv.grandTotal)}</div>
          </div>
        ))}
        {paid.length === 0 && (
          <div className="py-6 text-center font-mono text-[0.8rem] text-muted">Belum ada invoice lunas.</div>
        )}
      </div>
    </>
  );
}
