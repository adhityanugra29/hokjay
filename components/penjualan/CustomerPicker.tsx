"use client";

import { useRouter } from "next/navigation";
import { Panel, PanelHead, SearchInput, TableScroll } from "@/components/ui/Panel";
import { RowActionButton } from "@/components/ui/RowAction";
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

export default function CustomerPicker({ customers, search }: { customers: CustomerRow[]; search?: string }) {
  const router = useRouter();
  const { activeCustomer, setActiveCustomer } = useActiveCustomer();
  const { clear: clearCart } = useCart();
  const { clearAll: clearCatalogSelection } = useCatalogSelection();

  function selectCustomer(c: CustomerRow) {
    // Switching to a different customer starts a clean slate — the cart
    // and PDF checkbox selection from a previous customer's session aren't
    // relevant anymore and could get shipped to the wrong person otherwise.
    if (activeCustomer?.id !== c._id) {
      clearCart();
      clearCatalogSelection();
    }
    setActiveCustomer({ id: c._id, nama: c.nama, alamat: c.alamat, whatsapp: c.whatsapp });
    router.push("/katalog");
  }

  return (
    <>
      {activeCustomer && (
        <Panel className="mb-5 flex flex-wrap items-center justify-between gap-3 border-accent p-5">
          <div>
            <div className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">Pelanggan aktif saat ini</div>
            <div className="mt-1 text-[1rem] font-semibold">{activeCustomer.nama}</div>
            <div className="font-mono text-[0.75rem] text-muted">{activeCustomer.whatsapp}</div>
          </div>
          <Button onClick={() => router.push("/katalog")}>Lanjut ke Katalog →</Button>
        </Panel>
      )}

      <Panel>
        <PanelHead title="Pilih pelanggan untuk mulai penjualan">
          <form>
            <SearchInput name="search" defaultValue={search} placeholder="Cari nama pelanggan..." />
          </form>
        </PanelHead>
        <TableScroll>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                  Kode
                </th>
                <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                  Nama
                </th>
                <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                  Kontak
                </th>
                <th className="border-b border-line px-5 py-4" />
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c._id} className="hover:bg-[#fbfaf5]">
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{c.kode}</td>
                  <td className="border-b border-line px-5 py-4.5 font-medium">{c.nama}</td>
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{c.whatsapp}</td>
                  <td className="border-b border-line px-5 py-4.5">
                    <RowActionButton onClick={() => selectCustomer(c)}>
                      {activeCustomer?.id === c._id ? "✓ Terpilih" : "Pilih"}
                    </RowActionButton>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center font-mono text-sm text-muted">
                    Tidak ada pelanggan yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableScroll>
      </Panel>
    </>
  );
}
