"use client";

import { useEffect, useRef } from "react";
import { useCart, type CartItem } from "@/components/cart/CartProvider";
import InvoiceForm, { type InvoiceFormInitial } from "./InvoiceForm";

interface CustomerOption {
  _id: string;
  nama: string;
  alamat: string;
  whatsapp: string;
  provinsi: string;
  kota: string;
}
interface SalesOption {
  _id: string;
  nama: string;
}
interface CourierOption {
  _id: string;
  name: string;
}

/**
 * Pre-loads the cart with an existing invoice's items on mount, then renders
 * the invoice form in edit mode — so fixing a mistake doesn't mean re-typing
 * everything from scratch.
 *
 * History of this one effect, because it's been genuinely tricky to get
 * right:
 *
 * 1. Originally guarded only by a `useRef(false)` — but "+ Tambah Produk"
 *    used to navigate away to /katalog and back, remounting this component
 *    (fresh ref) and re-running loadItems(items) with the ORIGINAL
 *    server-fetched invoice items, discarding whatever was just added on
 *    Katalog. Per the user's report 2026-08-27.
 * 2. A sessionStorage "already seeded" marker was tried next — but it
 *    survived for the whole tab session regardless of whether the user
 *    ever actually came back to THIS invoice, so a later fresh visit to
 *    the same invoice (cart legitimately empty by then) wrongly skipped
 *    reseeding, showing a blank form. Per the user's report 2026-08-27.
 * 3. Replaced with "only seed if the cart is currently empty" — this
 *    happened to also fix (2), but was still built around (1)'s premise
 *    of a Katalog round-trip remounting this component mid-edit. Per the
 *    user's report 2026-08-28 ("produk tereset" after saving once,
 *    viewing the invoice, then editing it again), this heuristic itself
 *    turned out to be the wrong idea to begin with.
 *
 * "+ Tambah Produk" no longer navigates anywhere at all — it's
 * AddProductSidebar.tsx, an in-place overlay, added the same day as (1)'s
 * fix. That means this component now only ever remounts on a genuine fresh
 * navigation to this invoice's edit page — there's no round-trip left to
 * preserve additions across. Simplified to just always seed from the
 * server's current items on every mount: exactly what this invoice has
 * right now, no heuristics, no cases left where "skip it" was ever the
 * intent.
 */
export default function EditInvoiceLoader({
  invoiceId,
  nomor,
  items,
  initial,
  customers,
  salesList,
  couriers,
  currentUser,
}: {
  invoiceId: string;
  nomor: string;
  items: CartItem[];
  initial: InvoiceFormInitial;
  customers: CustomerOption[];
  salesList: SalesOption[];
  couriers: CourierOption[];
  /** Wasn't threaded through to the edit flow before — see InvoiceForm.tsx's own isOwner. Per the user's request 2026-09-05. */
  currentUser?: { nama: string; role: string } | null;
}) {
  const { loadItems } = useCart();
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    loadItems(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <InvoiceForm
      mode="edit"
      invoiceId={invoiceId}
      nextNumberHint={nomor}
      customers={customers}
      salesList={salesList}
      couriers={couriers}
      initial={initial}
      currentUser={currentUser}
    />
  );
}
