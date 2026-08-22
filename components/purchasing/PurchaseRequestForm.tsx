"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input, Select, Textarea } from "@/components/ui/Form";
import { Button, LinkButton } from "@/components/ui/Button";
import { useActiveCustomer } from "@/components/penjualan/ActiveCustomerProvider";

interface SalesOption {
  _id: string;
  nama: string;
}

/**
 * Katalog's "Request Produk PO" — for an item not yet in the
 * catalog/warehouse that a customer needs, tied to the active customer
 * picked on /penjualan. Lands on Purchasing's desk (under the "Request
 * Produk PO" tab) as a PurchaseRequest ticket for them to source and
 * eventually turn into a Tagihan Pembelian — see
 * components/purchasing/PurchaseBillForm.tsx. This is exclusively a
 * resale-merchandise flow — for office operational expenses (listrik,
 * wifi, pulsa, dll) see components/purchasing/OfficeExpenseForm.tsx
 * instead (confirmed with the user 2026-08-23: those are a separate,
 * simpler request/approval flow with no customer or product involved).
 */
export default function PurchaseRequestForm({
  salesList,
  redirectTo,
}: {
  salesList: SalesOption[];
  redirectTo: string;
}) {
  const router = useRouter();
  const { activeCustomer } = useActiveCustomer();

  const [namaBarang, setNamaBarang] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [qty, setQty] = useState("1");
  const [salesId, setSalesId] = useState("");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!namaBarang.trim()) {
      setError("Nama barang wajib diisi.");
      return;
    }
    if (!activeCustomer) {
      setError("Pilih pelanggan dulu di halaman Penjualan.");
      return;
    }
    const sales = salesList.find((s) => s._id === salesId);
    if (!sales) {
      setError("Pilih sales yang mengajukan.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/purchase-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sumber: "sales",
          namaBarang,
          deskripsi: deskripsi || undefined,
          qty: Number(qty) || 1,
          customerId: activeCustomer.id,
          customerNama: activeCustomer.nama,
          salesId: sales._id,
          salesNama: sales.nama,
          catatan: catatan || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal mengirim request pembelian");
      }
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim request pembelian");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel className="max-w-2xl p-7">
      <form onSubmit={handleSubmit}>
        <div className="mb-5 border border-line bg-[#f7f5ee] p-4 font-sans text-[0.85rem]">
          {activeCustomer ? (
            <>
              Untuk pelanggan: <span className="font-semibold text-ink">{activeCustomer.nama}</span>{" "}
              <Link href="/penjualan" className="text-accent underline underline-offset-2">
                Ganti
              </Link>
            </>
          ) : (
            <>
              Belum ada pelanggan aktif —{" "}
              <Link href="/penjualan" className="text-accent underline underline-offset-2">
                pilih pelanggan dulu
              </Link>
              .
            </>
          )}
        </div>

        <FormGrid>
          <Field label="Nama Barang" span2>
            <Input
              required
              value={namaBarang}
              onChange={(e) => setNamaBarang(e.target.value)}
              placeholder="Contoh: Meja Prep Stainless 200cm custom ukuran"
            />
          </Field>
          <Field label="Deskripsi / Spesifikasi" span2 hint="Ukuran, bahan, atau kebutuhan khusus lainnya">
            <Textarea rows={3} value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} />
          </Field>
          <Field label="Qty">
            <Input required type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <Field label="Sales (Yang Meminta)">
            <Select required value={salesId} onChange={(e) => setSalesId(e.target.value)}>
              <option value="">— Pilih sales —</option>
              {salesList.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.nama}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Catatan (opsional)" span2>
            <Textarea
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Info tambahan untuk tim purchasing..."
            />
          </Field>
        </FormGrid>

        {error && <div className="mt-3 font-mono text-[0.75rem] text-danger">{error}</div>}

        <FormActions>
          <Button type="submit" disabled={saving}>
            {saving ? "Mengirim..." : "Kirim Request ke Purchasing"}
          </Button>
          <LinkButton variant="ghost" href={redirectTo}>
            Batal
          </LinkButton>
        </FormActions>
      </form>
    </Panel>
  );
}
