"use client";

import { useEffect, useState } from "react";
import type { CartItem } from "@/components/cart/CartProvider";
import { useCart } from "@/components/cart/CartProvider";
import { CurrencyInput } from "@/components/ui/Form";
import { computeLineCommission, maxDiskonBekas } from "@/lib/commission";
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
  // Diskon-exceeds-insentif warning for barang bekas — see maxDiskonBekas
  // usage below. Per the user's request 2026-08-29.
  const [discountWarning, setDiscountWarning] = useState(false);

  const subtotal = (item.hargaJual - item.diskonPerUnit) * item.qty;
  // Matches lib/services/createInvoice.ts's/updateInvoice.ts's
  // authoritative save-time calculation — computeLineCommission takes
  // hargaJual/diskon separately now (floors at 0 for barang bekas). Per
  // the user's request 2026-08-29.
  const komisiPerUnit = computeLineCommission({
    isCustom: item.isCustom,
    kondisi: item.kondisi,
    hargaJual: item.hargaJual,
    diskon: item.diskonPerUnit,
    hargaMinimum: item.hargaMinimum,
    isFlashSale: item.isFlashSale,
  });
  return (
    <div className="mb-2.5 border border-line p-4">
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="flex-1 rounded bg-[#efece3] px-2.5 py-2 font-sans text-[0.88rem] font-medium">
          {item.name}
          {/* Snapshotted when this line was added (see ProductCard.tsx/
              AddProductSidebar.tsx) — stays showing even if the product's
              own Flash Sale is later ended. Per the user's request
              2026-08-29. */}
          {item.isFlashSale && (
            <span className="ml-2 font-mono text-[0.66rem] font-semibold text-accent-700">· Harga Special</span>
          )}
        </span>
        <span
          onClick={() => removeItem(item.productId)}
          className="cursor-pointer whitespace-nowrap font-mono text-[0.72rem] text-danger"
        >
          Hapus
        </span>
      </div>
      {/* Diskon /unit brought back 2026-08-29 — hidden 2026-08-28 because
          Harga Jual was already freely typed per line, making a separate
          discount field feel redundant. Restored per the user's explicit
          request to track discount separately and have it reduce komisi
          (see the hargaJual - item.diskonPerUnit above) — a price *and* a
          tracked discount now serve different purposes: Harga Jual is
          what the customer pays, Diskon is how much of that was given
          away and read out of the sales rep's commission for it. */}
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
              the user's request 2026-08-25 — harga jual is typed directly.
              CurrencyInput (accounting-style thousand separators) per the
              user's report 2026-08-25 that this field wasn't formatted yet. */}
          <CurrencyInput
            value={String(item.hargaJual)}
            onChange={(v) => updateItem(item.productId, { hargaJual: v ? Number(v) : 0 })}
          />
          {!item.isCustom && (
            <span className="font-mono text-[0.64rem] text-clay">Harga Minimum: {rupiah(item.hargaMinimum)}</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[0.62rem] uppercase text-muted">Diskon /unit</span>
          {/* Capped for barang bekas on blur — same rule/reasoning as
              ProductCard.tsx's Diskon field on Katalog. Per the user's
              request 2026-08-29. */}
          <CurrencyInput
            value={String(item.diskonPerUnit)}
            onChange={(v) => {
              updateItem(item.productId, { diskonPerUnit: v ? Number(v) : 0 });
              setDiscountWarning(false);
            }}
            onBlur={(v) => {
              if (item.kondisi !== "bekas") return;
              const num = v ? Number(v) : 0;
              const max = maxDiskonBekas(item.hargaJual, item.hargaMinimum);
              if (num > max) {
                updateItem(item.productId, { diskonPerUnit: max });
                setDiscountWarning(true);
              }
            }}
          />
          {discountWarning && (
            <span className="font-mono text-[0.62rem] font-medium text-accent-700">
              Melebihi batas insentif, disesuaikan ke maks. {rupiah(maxDiskonBekas(item.hargaJual, item.hargaMinimum))}.
            </span>
          )}
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
