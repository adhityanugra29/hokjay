"use client";

import { usePathname } from "next/navigation";
import { LinkButton } from "@/components/ui/Button";

/**
 * The Purchasing header's "+ Request Baru" action — dynamic per the user's
 * request 2026-08-23: it becomes "+ Buat PO", "+ Job Order", or
 * "+ Material Order" depending on which tab is currently active, instead
 * of always pointing at the same thing. Hidden on tabs that don't have a
 * "create" concept of their own here (Request Produk PO is sales-only;
 * Supplier has its own inline "+ Tambah Supplier" button in
 * components/purchasing/SupplierManager.tsx).
 */
export default function DynamicRequestButton() {
  const pathname = usePathname();

  // Only the tabs rendered inside app/purchasing/(list) share this header —
  // /purchasing/po/baru, /purchasing/baru, /purchasing/tagihan/baru, and
  // /purchasing/[id] each have their own standalone PageHeader outside this
  // layout.
  if (pathname === "/purchasing/tagihan") {
    return <LinkButton href="/purchasing/tagihan/baru">+ Material Order</LinkButton>;
  }
  if (pathname === "/purchasing/job-order") {
    return <LinkButton href="/purchasing/baru">+ Job Order</LinkButton>;
  }
  if (pathname === "/purchasing") {
    return <LinkButton href="/purchasing/po/baru">+ Buat PO</LinkButton>;
  }
  return null;
}
