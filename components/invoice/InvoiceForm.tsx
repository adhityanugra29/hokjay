"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input, Select } from "@/components/ui/Form";
import { Button, LinkButton } from "@/components/ui/Button";
import { useCart } from "@/components/cart/CartProvider";
import { useActiveCustomer } from "@/components/penjualan/ActiveCustomerProvider";
import ItemRowEditor from "./ItemRowEditor";
import { computeLineCommission } from "@/lib/commission";
import { rupiah } from "@/lib/format";

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

export interface InvoiceFormInitial {
  customerId?: string;
  salesId?: string;
  kurirId?: string;
  zonaId?: string;
  tanggalInvoice?: string;
  tanggalKirim?: string;
  shipAddress?: string;
}

export default function InvoiceForm({
  customers,
  salesList,
  couriers,
  zones,
  nextNumberHint,
  mode = "create",
  invoiceId,
  initial,
}: {
  customers: CustomerOption[];
  salesList: SalesOption[];
  couriers: CourierOption[];
  zones: ZoneOption[];
  nextNumberHint: string;
  mode?: "create" | "edit";
  invoiceId?: string;
  initial?: InvoiceFormInitial;
}) {
  const router = useRouter();
  const { items, clear } = useCart();
  const { activeCustomer } = useActiveCustomer();

  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  const [shipAddress, setShipAddress] = useState(initial?.shipAddress ?? "");
  const [salesId, setSalesId] = useState(initial?.salesId ?? "");
  const [tanggalInvoice, setTanggalInvoice] = useState(
    initial?.tanggalInvoice ?? new Date().toISOString().slice(0, 10)
  );
  const [tanggalKirim, setTanggalKirim] = useState(initial?.tanggalKirim ?? "");
  const [kurirId, setKurirId] = useState(initial?.kurirId ?? "");
  const [zonaId, setZonaId] = useState(initial?.zonaId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The customer is now picked upstream on /penjualan before browsing the
  // Katalog, so a new invoice should arrive with one already in hand
  // (still editable here). activeCustomer hydrates from localStorage a
  // tick after mount, so this can't just be a useState initializer — sync
  // it in once it's available, but only if nothing's been chosen yet (an
  // explicit `initial` from editing an existing invoice always wins).
  useEffect(() => {
    if (mode === "create" && !initial?.customerId && activeCustomer && !customerId) {
      setCustomerId(activeCustomer.id);
      setShipAddress((prev) => prev || activeCustomer.alamat);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCustomer]);

  const selectedCourier = couriers.find((c) => c._id === kurirId);
  const selectedZone = zones.find((z) => z._id === zonaId);
  const ongkosKirim = selectedZone?.cost ?? 0;
  const subtotalProduk = useMemo(
    () => items.reduce((s, i) => s + (i.hargaJual - i.diskonPerUnit) * i.qty, 0),
    [items]
  );
  const grandTotal = subtotalProduk + ongkosKirim;
  const komisiTotal = useMemo(
    () =>
      items.reduce(
        (s, i) =>
          s +
          computeLineCommission({
            isCustom: i.isCustom,
            kondisi: i.kondisi,
            hargaJual: i.hargaJual,
            hargaMinimum: i.hargaMinimum,
          }) *
            i.qty,
        0
      ),
    [items]
  );

  function selectCustomer(id: string) {
    setCustomerId(id);
    const c = customers.find((c) => c._id === id);
    if (c) setShipAddress(c.alamat);
  }

  async function submit(status: "draft" | "unpaid") {
    setError(null);
    if (items.length === 0) {
      setError("Belum ada produk di invoice ini.");
      return;
    }
    const customer = customers.find((c) => c._id === customerId);
    const sales = salesList.find((s) => s._id === salesId);
    if (!customer) return setError("Pilih pelanggan terlebih dahulu.");
    if (!sales) return setError("Pilih sales terlebih dahulu.");

    setSaving(true);
    try {
      const url = mode === "edit" ? `/api/invoices/${invoiceId}` : "/api/invoices";
      const res = await fetch(url, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer._id,
          customerNama: customer.nama,
          customerWhatsapp: customer.whatsapp,
          shipAddress,
          salesId: sales._id,
          salesNama: sales.nama,
          tanggalInvoice: tanggalInvoice || undefined,
          tanggalKirim: tanggalKirim || undefined,
          kurir: selectedCourier?.name,
          ongkosKirim,
          status,
          items: items.map((i) => ({
            productId: i.isCustom ? undefined : i.productId,
            namaSnapshot: i.isCustom ? i.name : undefined,
            qty: i.qty,
            hargaJual: i.hargaJual,
            diskonPerUnit: i.diskonPerUnit,
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || (mode === "edit" ? "Gagal mengubah invoice" : "Gagal membuat invoice"));
      }
      const invoice = await res.json();
      clear();
      router.push(status === "draft" ? "/invoice" : `/invoice/${invoice._id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan invoice");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel className="max-w-4xl p-7">
      <FormGrid className="mb-5 max-w-[420px]">
        <Field label="Nomor Invoice">
          <Input disabled value={nextNumberHint} />
        </Field>
        <Field label="Tanggal Invoice">
          <Input type="date" value={tanggalInvoice} onChange={(e) => setTanggalInvoice(e.target.value)} />
        </Field>
      </FormGrid>

      <FormGrid>
        <Field label="Pelanggan">
          <Select value={customerId} onChange={(e) => selectCustomer(e.target.value)}>
            <option value="">— Pilih pelanggan —</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.nama}
              </option>
            ))}
          </Select>
          <div className="mt-1 font-mono text-[0.7rem] text-muted">
            Belum ada di daftar?{" "}
            <Link href="/pelanggan/baru" className="text-moss underline">
              Tambah pelanggan baru
            </Link>
          </div>
        </Field>
        <Field label="Sales (Yang Closing)">
          <Select value={salesId} onChange={(e) => setSalesId(e.target.value)}>
            <option value="">— Pilih sales —</option>
            {salesList.map((s) => (
              <option key={s._id} value={s._id}>
                {s.nama}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tanggal Pengiriman">
          <Input type="date" value={tanggalKirim} onChange={(e) => setTanggalKirim(e.target.value)} />
        </Field>
        <Field label="Alamat Kirim">
          <Input
            value={shipAddress}
            onChange={(e) => setShipAddress(e.target.value)}
            placeholder="Otomatis terisi setelah pilih pelanggan"
          />
        </Field>
        <Field label="Pilih Kurir">
          <Select value={kurirId} onChange={(e) => setKurirId(e.target.value)}>
            <option value="">— Pilih kurir —</option>
            {couriers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Zona Pengiriman (jarak)">
          <Select value={zonaId} onChange={(e) => setZonaId(e.target.value)}>
            <option value="">— Pilih zona —</option>
            {zones.map((z) => (
              <option key={z._id} value={z._id}>
                {z.name} — {rupiah(z.cost)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ongkos Kirim">
          <Input disabled value={rupiah(ongkosKirim)} />
        </Field>
      </FormGrid>

      <div className="mt-7">
        <label className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">Item Produk</label>
        <div className="mt-3">
          {items.map((item) => (
            <ItemRowEditor key={item.productId} item={item} />
          ))}
          {items.length === 0 && (
            <div className="border border-dashed border-line py-6 text-center font-mono text-[0.8rem] text-muted">
              Belum ada produk. Tambahkan dari{" "}
              <Link href="/katalog" className="text-moss-deep underline">
                Katalog
              </Link>
              .
            </div>
          )}
        </div>
        <Link
          href="/katalog"
          className="mt-1 block w-full rounded border-[1.5px] border-dashed border-line py-3 text-center font-sans text-[0.85rem] text-muted hover:border-moss hover:bg-[#fbfaf5] hover:text-moss-deep"
        >
          + Tambah Produk
        </Link>
      </div>

      <div className="mt-5 border border-line bg-[#f7f5ee] p-5">
        <h3 className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">Estimasi Komisi Sales</h3>
        <div className="mt-1.5 font-mono text-[0.85rem]">
          Total komisi jika invoice ini lunas:{" "}
          <strong className="text-moss-deep">{rupiah(komisiTotal)}</strong>
        </div>
      </div>

      <div className="ml-auto mt-5 w-full max-w-[280px] font-mono text-[0.88rem]">
        <div className="flex justify-between py-1.5">
          <span>Subtotal Produk</span>
          <span>{rupiah(subtotalProduk)}</span>
        </div>
        <div className="flex justify-between py-1.5">
          <span>Ongkos Kirim</span>
          <span>{rupiah(ongkosKirim)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t-2 border-ink pt-3 font-serif text-lg font-semibold">
          <span>Total</span>
          <span>{rupiah(grandTotal)}</span>
        </div>
      </div>

      {error && <div className="mt-3 font-mono text-[0.75rem] text-danger">{error}</div>}

      <FormActions>
        <Button variant="clay" disabled={saving} onClick={() => submit("unpaid")}>
          {saving ? "Menyimpan..." : mode === "edit" ? "Simpan Perubahan" : "Simpan & Kirim Invoice"}
        </Button>
        <Button variant="ghost" disabled={saving} onClick={() => submit("draft")}>
          Simpan sebagai Draft
        </Button>
        <LinkButton variant="ghost" href={mode === "edit" ? `/invoice/${invoiceId}` : "/invoice"}>
          Batal
        </LinkButton>
      </FormActions>
    </Panel>
  );
}
