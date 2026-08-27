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
 * everything from an empty Katalog browse.
 *
 * The `loaded` ref used to be the only guard against re-loading — but it's
 * a fresh `useRef(false)` on every mount, and "+ Tambah Produk" navigates
 * away to /katalog and remounts this component when the user comes back.
 * That re-ran loadItems(items) with the ORIGINAL server-fetched invoice
 * items, silently discarding whatever product was just added on Katalog
 * (the cart got overwritten back to the pre-edit state). Per the user's
 * report 2026-08-27.
 *
 * A sessionStorage "already seeded" marker was tried next, but that had its
 * own bug: the marker survives for the whole tab session regardless of
 * whether the user ever actually comes back to THIS invoice — click Edit
 * once, leave without submitting (e.g. make an unrelated new invoice,
 * which clears the cart on submit), then click Edit on this same invoice
 * again later in the same tab, and the stale marker skipped reseeding an
 * now-empty cart, showing the edit form with zero items ("data ke-reset").
 * Per the user's report 2026-08-27.
 *
 * Fixed by dropping the marker entirely: only seed when the cart is
 * currently EMPTY. A genuine Katalog round-trip leaves the cart non-empty
 * (this invoice's original items, plus whatever was just added) — skipped,
 * preserving the addition. Anything else that leaves the cart empty by the
 * time this mounts (a fresh visit, or a stale marker's exact failure mode
 * above) correctly reseeds instead of showing a blank form.
 */
export default function EditInvoiceLoader({
  invoiceId,
  nomor,
  items,
  initial,
  customers,
  salesList,
  couriers,
}: {
  invoiceId: string;
  nomor: string;
  items: CartItem[];
  initial: InvoiceFormInitial;
  customers: CustomerOption[];
  salesList: SalesOption[];
  couriers: CourierOption[];
}) {
  const { items: cartItems, loadItems } = useCart();
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    if (cartItems.length === 0) loadItems(items);
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
    />
  );
}
