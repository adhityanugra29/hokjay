"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Pill from "@/components/ui/Pill";

export default function PayoutToggle({ invoiceId, cair }: { invoiceId: string; cair: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    await fetch(`/api/invoices/${invoiceId}/payout`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ komisiCair: !cair }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <button type="button" onClick={toggle} disabled={pending} className="cursor-pointer disabled:opacity-50">
      <Pill variant={cair ? "paid" : "unpaid"}>{cair ? "Sudah" : "Belum"}</Pill>
    </button>
  );
}
