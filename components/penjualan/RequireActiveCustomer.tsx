"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActiveCustomer } from "./ActiveCustomerProvider";

/**
 * Gates the product-browsing pages (Katalog, Produk Custom, Pesan Custom)
 * behind having picked a customer first on /penjualan — see confirmation
 * with the user 2026-08-20. Renders nothing until localStorage has hydrated
 * so a real "no customer" doesn't briefly flash the product grid before the
 * redirect fires.
 */
export default function RequireActiveCustomer({ children }: { children: React.ReactNode }) {
  const { activeCustomer, hydrated } = useActiveCustomer();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !activeCustomer) {
      router.replace("/penjualan");
    }
  }, [hydrated, activeCustomer, router]);

  if (!hydrated || !activeCustomer) return null;
  return <>{children}</>;
}
