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
 * report 2026-08-27. A sessionStorage marker survives the remount, so the
 * seed only ever happens once per actual edit session — switching to a
 * different invoice (different invoiceId) still seeds fresh.
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
  const { loadItems } = useCart();
  const loaded = useRef(false);
  const seededKey = `invoiceEditSeeded:${invoiceId}`;

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    try {
      if (sessionStorage.getItem(seededKey) === "1") return; // already seeded this edit session — don't clobber it
      sessionStorage.setItem(seededKey, "1");
    } catch {
      // storage unavailable — fall through and seed anyway, same as before this fix
    }
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
    />
  );
}
