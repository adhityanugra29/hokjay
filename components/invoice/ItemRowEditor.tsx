"use client";

import { useEffect, useState } from "react";
import type { CartItem } from "@/components/cart/CartProvider";
import { useCart } from "@/components/cart/CartProvider";
import { computeLineCommission } from "@/lib/commission";
import { rupiah } from "@/lib/format";

/**
 * A number input backed by its own local string buffer instead of being
 * bound straight to the numeric cart value. Fixes the classic controlled-
 * number-input bug where clearing the field to type a fresh value forces it
 * to "0" mid-edit, so new digits land after that stuck zero (e.g. typing
 * "1000" over "100" produced "01000"). The buffer stays free-form (can be
 * empty) while focused; it's only clamped/normalized on blur.
 */
function NumberField({
  value,
  min,
  onCommit,
}: {
  value: number;
  min?: number;
  onCommit: (n: number) => void;
}) {
  const [raw, setRaw] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setRaw(String(value));
  }, [value, focused]);

  return (
    <input
      type="number"
      min={min}
      value={raw}
      onFocus={(e) => {
        setFocused(true);
        e.target.select();
      }}
      onChange={(e) => {
        setRaw(e.target.value);
        const n = Number(e.target.value);
        if (!Number.isNaN(n)) onCommit(n);
      }}
      onBlur={(e) => {
        setFocused(false);
        const n = Math.max(min ?? 0, Number(e.target.value) || 0);
        setRaw(String(n));
        onCommit(n);
      }}
      className="w-full rounded border border-line bg-paper px-2 py-2 font-mono text-[0.82rem]"
    />
  );
}

export default function ItemRowEditor({ item }: { item: CartItem }) {
  const { updateItem, removeItem } = useCart();

  const subtotal = (item.hargaJual - item.diskonPerUnit) * item.qty;
  const komisiPerUnit = computeLineCommission({
    isCustom: item.isCustom,
    kondisi: item.kondisi,
    hargaJual: item.hargaJual,
    hargaMinimum: item.hargaMinimum,
  });
  const hargaFloor = item.isCustom ? 0 : item.hargaMinimum;

  return (
    <div className="mb-2.5 border border-line p-4">
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="flex-1 rounded bg-[#efece3] px-2.5 py-2 font-sans text-[0.88rem] font-medium">
          {item.name}
        </span>
        <span
          onClick={() => removeItem(item.productId)}
          className="cursor-pointer whitespace-nowrap font-mono text-[0.72rem] text-danger"
        >
          Hapus
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-6">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[0.62rem] uppercase text-muted">Stok</span>
          <span className="py-2 font-mono text-[0.82rem] text-muted">
            {item.isCustom ? "—" : `${item.stok} unit`}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[0.62rem] uppercase text-muted">Qty</span>
          <NumberField value={item.qty} min={1} onCommit={(qty) => updateItem(item.productId, { qty })} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[0.62rem] uppercase text-muted">Harga Jual</span>
          {/* "Pakai Minimum"/"Pakai Rekomendasi" preset buttons removed per
              the user's request 2026-08-25 — harga jual is typed directly. */}
          <NumberField
            value={item.hargaJual}
            min={hargaFloor}
            onCommit={(hargaJual) => updateItem(item.productId, { hargaJual })}
          />
          {!item.isCustom && (
            <span className="font-mono text-[0.64rem] text-clay">Harga Minimum: {rupiah(item.hargaMinimum)}</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[0.62rem] uppercase text-muted">Diskon /unit</span>
          <NumberField
            value={item.diskonPerUnit}
            min={0}
            onCommit={(diskonPerUnit) => updateItem(item.productId, { diskonPerUnit })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[0.62rem] uppercase text-muted">Harga Final</span>
          <span className="py-2 font-mono text-[0.82rem] font-medium">{rupiah(subtotal)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[0.62rem] uppercase text-muted">Komisi</span>
          <span className="py-2 font-mono text-[0.82rem] text-moss-deep">
            {rupiah(komisiPerUnit)} x{item.qty}
          </span>
        </div>
      </div>
    </div>
  );
}
