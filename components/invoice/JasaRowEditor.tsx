"use client";

import type { CartItem } from "@/components/cart/CartProvider";
import { useCart } from "@/components/cart/CartProvider";
import { CurrencyInput } from "@/components/ui/Form";
import { rupiah } from "@/lib/format";

/**
 * Invoice line for a service fee (jasa) — only a typed flat Harga. No Qty,
 * Stok, Harga Bottom, Diskon, or Komisi, unlike ItemRowEditor. Per the
 * user's request 2026-10-07.
 */
export default function JasaRowEditor({ item }: { item: CartItem }) {
  const { updateItem, removeItem } = useCart();

  return (
    <div className="mb-2.5 rounded-xl bg-panel p-4 shadow-sm">
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="flex-1 rounded-lg bg-[#efece3] px-2.5 py-2 font-sans text-[0.88rem] font-medium">
          {item.name}
          <span className="ml-2 rounded-full border border-accent-700 bg-accent-100 px-2 py-0.5 font-mono text-[0.62rem] font-semibold text-accent-700">
            Jasa
          </span>
        </span>
        <span
          onClick={() => removeItem(item.productId)}
          className="cursor-pointer whitespace-nowrap font-mono text-[0.72rem] text-danger"
        >
          Hapus
        </span>
      </div>
      <div className="grid max-w-[520px] grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[0.62rem] uppercase text-muted">Harga Jasa</span>
          <CurrencyInput
            value={item.hargaJual ? String(item.hargaJual) : ""}
            onChange={(v) => updateItem(item.productId, { hargaJual: v ? Number(v) : 0 })}
            placeholder="0"
          />
          <span className="font-mono text-[0.64rem] text-muted">Harga flat, tanpa diskon &amp; komisi</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[0.62rem] uppercase text-muted">Harga Final</span>
          <span className="py-2 font-mono text-[0.82rem] font-medium">{rupiah(item.hargaJual)}</span>
        </div>
      </div>
    </div>
  );
}
