import type { CartItem } from "@/components/cart/CartProvider";

/**
 * Cart line for a service fee (jasa). Every call yields a NEW line — the
 * cart merges lines by productId, and a jasa has no qty (one line = one flat
 * price), so adding the same jasa twice must become two separate lines
 * rather than bumping a quantity. `jasaId` is the real Jasa _id sent to the
 * server; productId is only the cart key. Per the user's request 2026-10-07.
 */
export function makeJasaCartItem(
  jasa: { _id: string; nama: string },
  hargaJual = 0
): Omit<CartItem, "qty" | "diskonPerUnit"> {
  const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  return {
    productId: `jasa:${jasa._id}:${unique}`,
    jasaId: jasa._id,
    name: jasa.nama,
    hargaJual,
    hargaMinimum: 0,
    komisiNominal: 0,
    stok: 0,
    isJasa: true,
  };
}
