"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input, Select, Textarea } from "@/components/ui/Form";
import { Button, LinkButton } from "@/components/ui/Button";
import { rupiah } from "@/lib/format";

interface SupplierOption {
  _id: string;
  namaUsaha: string;
}

interface ProductOption {
  _id: string;
  name: string;
  hargaBeli: number;
}

interface ItemRow {
  productId: string;
  qty: string;
  hargaSatuan: string;
}

function blankRow(): ItemRow {
  return { productId: "", qty: "1", hargaSatuan: "" };
}

export default function PurchaseOrderForm({
  suppliers,
  products,
  initial,
}: {
  suppliers: SupplierOption[];
  products: ProductOption[];
  initial?: { supplierId?: string; productId?: string; qty?: string };
}) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState(initial?.supplierId ?? "");
  const [items, setItems] = useState<ItemRow[]>(() =>
    initial?.productId
      ? [
          {
            productId: initial.productId,
            qty: initial.qty ?? "1",
            hargaSatuan: String(products.find((p) => p._id === initial.productId)?.hargaBeli ?? ""),
          },
        ]
      : [blankRow()]
  );
  const [tanggalEstimasi, setTanggalEstimasi] = useState("");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.hargaSatuan) || 0), 0);

  function updateItem(idx: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function pickProduct(idx: number, productId: string) {
    const product = products.find((p) => p._id === productId);
    updateItem(idx, { productId, hargaSatuan: product ? String(product.hargaBeli) : "" });
  }

  function addRow() {
    setItems((prev) => [...prev, blankRow()]);
  }

  function removeRow(idx: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supplierId) return setError("Pilih supplier.");
    if (items.some((i) => !i.productId)) return setError("Semua baris harus punya produk.");

    setSaving(true);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          items: items.map((i) => ({
            productId: i.productId,
            qty: Number(i.qty) || 1,
            hargaSatuan: Number(i.hargaSatuan) || 0,
          })),
          tanggalEstimasi: tanggalEstimasi || undefined,
          catatan: catatan || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal membuat PO");
      }
      const po = await res.json();
      router.push(`/purchasing/po/${po._id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat PO");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel className="max-w-3xl p-7">
      <form onSubmit={handleSubmit}>
        <FormGrid>
          <Field label="Supplier" span2>
            <Select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">— Pilih supplier —</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.namaUsaha}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estimasi Barang Datang (ETA, opsional)">
            <Input type="date" value={tanggalEstimasi} onChange={(e) => setTanggalEstimasi(e.target.value)} />
          </Field>
        </FormGrid>

        <div className="mt-6">
          <label className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">Barang Dipesan</label>
          <div className="mt-3 flex flex-col gap-3">
            {items.map((row, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-3 border border-line bg-[#f7f5ee] p-3.5 sm:grid-cols-[1fr_90px_150px_32px] sm:items-end">
                <div className="col-span-2 sm:col-span-1">
                  <Field label="Produk">
                    <Select required value={row.productId} onChange={(e) => pickProduct(idx, e.target.value)}>
                      <option value="">— Pilih produk —</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Field label="Qty">
                  <Input type="number" min={1} value={row.qty} onChange={(e) => updateItem(idx, { qty: e.target.value })} />
                </Field>
                <Field label="Harga Satuan">
                  <Input
                    type="number"
                    min={0}
                    value={row.hargaSatuan}
                    onChange={(e) => updateItem(idx, { hargaSatuan: e.target.value })}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  disabled={items.length === 1}
                  className="col-span-2 h-[42px] cursor-pointer border border-line font-mono text-[0.8rem] text-muted hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-1"
                >
                  × Hapus Baris
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addRow}
            className="mt-2 w-full cursor-pointer border-[1.5px] border-dashed border-line py-2.5 text-center font-sans text-[0.82rem] text-muted hover:border-accent hover:text-accent"
          >
            + Tambah Barang
          </button>
        </div>

        <div className="mt-5">
          <Field label="Catatan (opsional)">
            <Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          </Field>
        </div>

        <div className="mt-5 border border-line bg-[#f7f5ee] p-5">
          <div className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">Total Nilai PO</div>
          <div className="mt-1 text-[1.6rem] font-extrabold text-accent-700">{rupiah(total)}</div>
        </div>

        {error && <div className="mt-3 font-mono text-[0.75rem] text-danger">{error}</div>}

        <FormActions>
          <Button type="submit" disabled={saving}>
            {saving ? "Menyimpan..." : "Buat PO"}
          </Button>
          <LinkButton variant="ghost" href="/purchasing">
            Batal
          </LinkButton>
        </FormActions>
      </form>
    </Panel>
  );
}
