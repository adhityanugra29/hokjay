import { Jasa } from "@/models/Jasa";

/**
 * Builds the persisted invoice item for a service-fee (jasa) line — shared
 * by createInvoice.ts and updateInvoice.ts so the two can't drift apart.
 *
 * A jasa line deliberately skips everything a product line goes through:
 * no stock check, no harga-minimum floor, no diskon (a raw diskonPerUnit in
 * the request is ignored), no commission, no HPP snapshot, and no qty — one
 * line is one flat price, always qty 1 (the same jasa twice = two lines).
 * The price is whatever the user typed for this invoice. Per the user's
 * request 2026-10-07.
 */
export function buildJasaLine(
  input: { jasaId: string; hargaJual: number },
  jasaMap: Map<string, { _id: unknown; nama: string }>
) {
  const jasa = jasaMap.get(input.jasaId);
  if (!jasa) throw new Error(`Jasa ${input.jasaId} tidak ditemukan`);
  if (!(input.hargaJual > 0)) throw new Error(`Harga jasa ${jasa.nama} wajib diisi`);
  return {
    product: undefined,
    isCustom: false,
    isJasa: true,
    jasa: jasa._id,
    namaSnapshot: jasa.nama,
    qty: 1,
    hargaJual: input.hargaJual,
    hargaMinimumSnapshot: 0,
    diskonPerUnit: 0,
    isFlashSale: false,
    subtotal: input.hargaJual,
    komisiPerItemSnapshot: 0,
    komisiSubtotal: 0,
  };
}

export async function loadJasaMap(jasaIds: string[]) {
  if (jasaIds.length === 0) return new Map<string, { _id: unknown; nama: string }>();
  const docs = await Jasa.find({ _id: { $in: jasaIds } }).lean();
  return new Map(docs.map((j) => [String(j._id), j]));
}
