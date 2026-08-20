"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/components/cart/CartProvider";
import { useCatalogSelection } from "@/components/katalog/CatalogSelectionProvider";
import { useActiveCustomer } from "./ActiveCustomerProvider";

interface CustomerRow {
  _id: string;
  kode: string;
  nama: string;
  whatsapp: string;
  alamat: string;
}

/**
 * Single search-as-you-type combobox (not a full table) — the whole point
 * of /penjualan is to get a customer picked in one quick step before moving
 * on to the Katalog, not to browse/manage the customer list (that's what
 * /pelanggan is for). See confirmation with the user 2026-08-20.
 */
export default function CustomerPicker({ customers }: { customers: CustomerRow[] }) {
  const router = useRouter();
  const { activeCustomer, setActiveCustomer } = useActiveCustomer();
  const { clear: clearCart } = useCart();
  const { clearAll: clearCatalogSelection } = useCatalogSelection();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers.filter((c) => c.nama.toLowerCase().includes(q)).slice(0, 8);
  }, [customers, query]);

  function pick(c: CustomerRow) {
    setSelected(c);
    setQuery(c.nama);
    setOpen(false);
  }

  function goJualan() {
    if (!selected) return;
    // Switching to a different customer than the one already active starts
    // a clean slate — a previous customer's cart/PDF picks aren't relevant
    // anymore and could get shipped to the wrong person otherwise.
    if (activeCustomer?.id !== selected._id) {
      clearCart();
      clearCatalogSelection();
    }
    setActiveCustomer({ id: selected._id, nama: selected.nama, alamat: selected.alamat, whatsapp: selected.whatsapp });
    router.push("/katalog");
  }

  return (
    <Panel className="mx-auto max-w-lg p-7">
      <label className="mb-2 block font-mono text-[0.7rem] uppercase tracking-wide text-muted">
        Cari pelanggan
      </label>
      <div ref={boxRef} className="relative">
        <input
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setOpen(true);
          }}
          placeholder="Ketik nama pelanggan..."
          className="w-full border border-line bg-panel px-3.5 py-3 font-sans text-[0.9rem]"
        />
        {open && (
          <div className="absolute top-full right-0 left-0 z-10 max-h-64 overflow-y-auto border border-t-0 border-line bg-panel shadow-lg">
            {results.map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() => pick(c)}
                className="block w-full cursor-pointer border-b border-line px-3.5 py-2.5 text-left last:border-b-0 hover:bg-[#fbfaf5]"
              >
                <div className="text-[0.88rem] font-medium">{c.nama}</div>
                <div className="font-mono text-[0.72rem] text-muted">{c.whatsapp}</div>
              </button>
            ))}
            {results.length === 0 && (
              <div className="px-3.5 py-4 text-center font-mono text-[0.78rem] text-muted">
                Tidak ada pelanggan yang cocok.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-2">
        <Link href="/pelanggan/baru" className="font-sans text-[0.78rem] text-accent underline underline-offset-2">
          + Tambah pelanggan baru
        </Link>
      </div>

      <Button onClick={goJualan} disabled={!selected} className="mt-5 w-full">
        Ayo Jualan
      </Button>
    </Panel>
  );
}
