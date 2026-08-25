import { dbConnect } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { Invoice } from "@/models/Invoice";

/**
 * "Daftar prioritas" for Pelanggan (2026-08-22 redesign, "3b") — who has
 * outstanding debt, who's gone quiet, who's worth calling this week.
 * Everything here is derived on read from Invoice + Customer.kota/termHari
 * (no new persisted aggregate table) since this app's customer count is
 * small enough that a full scan per page load is cheap.
 */
export interface CustomerPriorityRow {
  _id: string;
  kode: string;
  nama: string;
  kota?: string;
  orderCount: number;
  nilaiBelanja: number;
  piutang: number;
  lastOrderDate?: Date;
  hariSejakOrderTerakhir?: number;
  kebiasaanBayar: "tepat-waktu" | "tempo" | "lewat" | "belum-pernah";
  kebiasaanBayarLabel: string;
  hariTerlambat?: number; // only set when kebiasaanBayar === "lewat"
  hariTempoSisa?: number; // only set when kebiasaanBayar === "tempo"
}

export interface PelangganSummary {
  pelangganAktif: number; // ordered within last 90 days
  totalPiutang: number;
  piutangCustomerCount: number;
  lewatJatuhTempoCount: number;
  lewatJatuhTempoTotal: number;
  jarangPesanCount: number; // used to order regularly, now >60 days quiet
  rows: CustomerPriorityRow[];
  perluDitelepon: CustomerPriorityRow[];
  kotaTerbesar: { kota: string; count: number }[];
}

const AKTIF_HARI = 90;
const JARANG_PESAN_HARI = 60;

export async function getPelangganSummary(): Promise<PelangganSummary> {
  await dbConnect();
  const [customers, invoices] = await Promise.all([
    Customer.find().lean(),
    Invoice.find({ "customer.ref": { $ne: null } }).lean(),
  ]);

  const byCustomer = new Map<string, typeof invoices>();
  for (const inv of invoices) {
    const key = String(inv.customer?.ref);
    const list = byCustomer.get(key) ?? [];
    list.push(inv);
    byCustomer.set(key, list);
  }

  const now = Date.now();
  const rows: CustomerPriorityRow[] = customers.map((c) => {
    const custInvoices = byCustomer.get(String(c._id)) ?? [];
    const paid = custInvoices.filter((i) => i.status === "paid");
    const unpaid = custInvoices.filter((i) => i.status === "unpaid");

    const orderCount = paid.length;
    const nilaiBelanja = paid.reduce((s, i) => s + i.grandTotal, 0);
    const piutang = unpaid.reduce((s, i) => s + i.grandTotal, 0);

    const allDates = custInvoices
      .map((i) => i.tanggalInvoice ?? i.createdAt)
      .filter(Boolean) as Date[];
    const lastOrderDate = allDates.length > 0 ? new Date(Math.max(...allDates.map((d) => new Date(d).getTime()))) : undefined;
    const hariSejakOrderTerakhir = lastOrderDate ? Math.floor((now - lastOrderDate.getTime()) / 86_400_000) : undefined;

    const termHari = c.termHari ?? 0;
    let kebiasaanBayar: CustomerPriorityRow["kebiasaanBayar"] = "belum-pernah";
    let hariTerlambat: number | undefined;
    let hariTempoSisa: number | undefined;
    let kebiasaanBayarLabel = "belum ada riwayat";

    if (unpaid.length > 0) {
      const oldestUnpaid = unpaid.reduce((oldest, i) => {
        const t = new Date(i.tanggalInvoice ?? i.createdAt).getTime();
        return t < oldest ? t : oldest;
      }, Infinity);
      const hariBerjalan = Math.floor((now - oldestUnpaid) / 86_400_000);
      if (hariBerjalan > termHari) {
        kebiasaanBayar = "lewat";
        hariTerlambat = hariBerjalan - termHari;
        kebiasaanBayarLabel = `lewat ${hariTerlambat} hari`;
      } else {
        kebiasaanBayar = "tempo";
        hariTempoSisa = termHari - hariBerjalan;
        kebiasaanBayarLabel = termHari > 0 ? `tempo ${termHari} hari` : "tunai";
      }
    } else if (orderCount > 0) {
      kebiasaanBayar = "tepat-waktu";
      kebiasaanBayarLabel = "tepat waktu";
    }

    return {
      _id: String(c._id),
      kode: c.kode,
      nama: c.nama,
      kota: c.kota || undefined,
      orderCount,
      nilaiBelanja,
      piutang,
      lastOrderDate,
      hariSejakOrderTerakhir,
      kebiasaanBayar,
      kebiasaanBayarLabel,
      hariTerlambat,
      hariTempoSisa,
    };
  });

  rows.sort((a, b) => b.nilaiBelanja - a.nilaiBelanja);

  const pelangganAktif = rows.filter(
    (r) => r.hariSejakOrderTerakhir !== undefined && r.hariSejakOrderTerakhir <= AKTIF_HARI
  ).length;

  const withPiutang = rows.filter((r) => r.piutang > 0);
  const totalPiutang = withPiutang.reduce((s, r) => s + r.piutang, 0);

  const lewatJatuhTempo = rows.filter((r) => r.kebiasaanBayar === "lewat");
  const lewatJatuhTempoTotal = lewatJatuhTempo.reduce((s, r) => s + r.piutang, 0);

  // "Mulai jarang pesan": ordered regularly before (2+ orders) but quiet >60 days.
  const jarangPesan = rows.filter(
    (r) => r.orderCount >= 2 && r.hariSejakOrderTerakhir !== undefined && r.hariSejakOrderTerakhir > JARANG_PESAN_HARI
  );

  const perluDitelepon = [...lewatJatuhTempo, ...jarangPesan]
    .filter((r, i, arr) => arr.findIndex((x) => x._id === r._id) === i)
    .sort((a, b) => (b.hariTerlambat ?? 0) - (a.hariTerlambat ?? 0))
    .slice(0, 5);

  const kotaMap = new Map<string, number>();
  for (const c of customers) {
    const kota = c.kota?.trim() || "Lainnya";
    kotaMap.set(kota, (kotaMap.get(kota) ?? 0) + 1);
  }
  const kotaTerbesar = [...kotaMap.entries()]
    .map(([kota, count]) => ({ kota, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  return {
    pelangganAktif,
    totalPiutang,
    piutangCustomerCount: withPiutang.length,
    lewatJatuhTempoCount: lewatJatuhTempo.length,
    lewatJatuhTempoTotal,
    jarangPesanCount: jarangPesan.length,
    rows,
    perluDitelepon,
    kotaTerbesar,
  };
}
