"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/Form";

/**
 * Kota filter for the Pelanggan list — per the user's request 2026-09-19
 * ("tampilkan filter di setiap header tablenya"). Same navigate-by-URL-
 * param pattern as InvoicePeriodFilter.tsx: preserves whatever else is
 * already in the URL (search, filter=piutang) when changed.
 */
export default function PelangganKotaFilter({
  kota,
  availableKota,
}: {
  kota?: string;
  availableKota: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(nextKota: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextKota) params.set("kota", nextKota);
    else params.delete("kota");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={kota ?? ""} onChange={(e) => update(e.target.value)} className="!w-auto !py-2 !text-[0.78rem]">
      <option value="">Semua Kota</option>
      {availableKota.map((k) => (
        <option key={k} value={k}>
          {k}
        </option>
      ))}
    </Select>
  );
}
