import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { invoiceVisibilityFilter } from "@/lib/invoice-visibility";
import { getShippingPriorityInvoices, shippingUrgency, type ShippingTone } from "@/lib/dashboard";
import type { SessionPayload } from "@/lib/auth/jwt";

/** Payment label shown next to a shipment — "draft" only ever appears on the Perlu Dikirim tab. */
export type PengirimanBayar = "draft" | "unpaid" | "dp" | "paid";

interface PengirimanRowBase {
  invoiceId: string;
  nomor: string;
  customerNama: string;
  salesNama: string;
  kota?: string;
  alamat?: string;
  catatan?: string;
  kurir?: string;
  ongkir: number;
  bayar: PengirimanBayar;
  /** Invoice.tanggalKirim as ISO, i.e. the planned ship date ("Jadwal Kirim"). */
  jadwal?: string;
}

export interface PengirimanTodoRow extends PengirimanRowBase {
  /** "Terlambat 3 hari" / "Kirim Hari Ini" / "Besok" / "Kirim 25 Okt" / "Belum Dijadwalkan" — the date itself has its own column, so shippingUrgency()'s "(22 Okt)" suffix is dropped. */
  statusLabel: string;
  tone: ShippingTone;
}

export interface PengirimanSentRow extends PengirimanRowBase {
  /** Invoice.tanggalDikirimAktual as ISO ("Tgl Kirim"). */
  tanggalKirim?: string;
  dikirimOleh?: string;
  noResiKirim?: string;
}

/** Newest-first cap on the Sudah Dikirim tab — shipped invoices only ever accumulate. */
const SENT_LIMIT = 500;

function bayarOf(status: string, hasDp: boolean): PengirimanBayar {
  if (status === "paid") return "paid";
  if (status === "draft") return "draft";
  return hasDp ? "dp" : "unpaid";
}

const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : undefined);

/**
 * Data for /pengiriman (TASK-046). The "Perlu Dikirim" membership and order
 * come straight from getShippingPriorityInvoices (unchanged — Lunas → Sudah
 * DP → Belum Bayar, then urgency), only enriched with the shipping fields
 * that function's row shape doesn't carry (kota, alamat, catatan, ongkir).
 * "Sudah Dikirim" is every invoice with dikirim=true, newest ship date
 * first. Both lists honour invoiceVisibilityFilter, so a plain "sales" only
 * ever receives their own invoices.
 */
export async function getPengirimanData(session?: SessionPayload | null): Promise<{
  todo: PengirimanTodoRow[];
  sent: PengirimanSentRow[];
}> {
  await dbConnect();
  const shipping = await getShippingPriorityInvoices(session);

  const [extra, sentDocs] = await Promise.all([
    Invoice.find({ _id: { $in: shipping.map((r) => r.invoiceId) } })
      .select("kota shipAddress catatan ongkosKirim")
      .lean(),
    Invoice.find({ dikirim: true, ...invoiceVisibilityFilter(session) })
      .sort({ tanggalDikirimAktual: -1 })
      .limit(SENT_LIMIT)
      .lean(),
  ]);
  const extraById = new Map(extra.map((e) => [String(e._id), e]));

  const todo: PengirimanTodoRow[] = shipping.map((r) => {
    const e = extraById.get(r.invoiceId);
    const urgency = shippingUrgency(r.tanggalKirim);
    return {
      invoiceId: r.invoiceId,
      nomor: r.nomor,
      customerNama: r.customerNama,
      salesNama: r.salesNama,
      kota: e?.kota || undefined,
      alamat: e?.shipAddress || undefined,
      catatan: e?.catatan || undefined,
      kurir: r.kurir,
      ongkir: e?.ongkosKirim ?? 0,
      bayar: bayarOf(r.status, r.hasDp),
      jadwal: iso(r.tanggalKirim),
      statusLabel: urgency.label.replace(/\s*\(.*\)$/, ""),
      tone: urgency.tone,
    };
  });

  const sent: PengirimanSentRow[] = sentDocs.map((inv) => ({
    invoiceId: String(inv._id),
    nomor: inv.nomor,
    customerNama: inv.customer?.nama || "—",
    salesNama: inv.sales?.nama ?? "—",
    kota: inv.kota || undefined,
    alamat: inv.shipAddress || undefined,
    catatan: inv.catatan || undefined,
    kurir: inv.kurir || undefined,
    ongkir: inv.ongkosKirim ?? 0,
    bayar: bayarOf(inv.status, !!inv.dp?.nominal),
    jadwal: iso(inv.tanggalKirim),
    tanggalKirim: iso(inv.tanggalDikirimAktual),
    dikirimOleh: inv.dikirimOleh || undefined,
    noResiKirim: inv.noResiKirim || undefined,
  }));

  return { todo, sent };
}
