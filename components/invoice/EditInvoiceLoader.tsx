"use client";

import { useEffect, useRef } from "react";
import { useCart, type CartItem } from "@/components/cart/CartProvider";
import InvoiceForm, { type InvoiceFormInitial } from "./InvoiceForm";

interface CustomerOption {
  _id: string;
  nama: string;
  alamat: string;
  whatsapp: string;
}
interface SalesOption {
  _id: string;
  nama: string;
}
interface CourierOption {
  _id: string;
  name: string;
}
interface ZoneOption {
  _id: string;
  name: string;
  cost: number;
}

/**
 * Pre-loads the cart with an existing invoice's items on mount, then renders
 * the invoice form in edit mode — so fixing a mistake doesn't mean re-typing
 * everything from an empty Katalog browse.
 */
export default function EditInvoiceLoader({
  invoiceId,
  nomor,
  items,
  initial,
  customers,
  salesList,
  couriers,
  zones,
}: {
  invoiceId: string;
  nomor: string;
  items: CartItem[];
  initial: InvoiceFormInitial;
  customers: CustomerOption[];
  salesList: SalesOption[];
  couriers: CourierOption[];
  zones: ZoneOption[];
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
      zones={zones}
      initial={initial}
    />
  );
}
