"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input, Select, Textarea } from "@/components/ui/Form";
import { Button, LinkButton } from "@/components/ui/Button";
import UploadBox from "@/components/ui/UploadBox";
import { useCart } from "@/components/cart/CartProvider";
import { CUSTOM_ORDER_CATEGORIES, type CustomOrderCategoryId } from "@/lib/constants";
import { customOrderEstimate } from "@/lib/pricing";
import { rupiah, productDisplayName } from "@/lib/format";

interface CustomItemRow {
  id: string;
  categoryId: CustomOrderCategoryId;
  panjang: string;
  lebar: string;
  tinggi: string;
  ketebalan: string;
  tingkat: number;
  qty: number;
  notes: string;
}

let rowCounter = 0;
function newRow(): CustomItemRow {
  rowCounter += 1;
  return {
    id: `row-${rowCounter}`,
    categoryId: "meja",
    panjang: "",
    lebar: "",
    tinggi: "",
    ketebalan: "1",
    tingkat: 1,
    qty: 1,
    notes: "",
  };
}

function estimateFor(row: CustomItemRow): number {
  return customOrderEstimate({
    categoryId: row.categoryId,
    panjangCm: Number(row.panjang),
    lebarCm: Number(row.lebar),
    tinggiCm: Number(row.tinggi),
    ketebalanMm: Number(row.ketebalan),
    tingkat: row.tingkat,
  });
}

export default function CustomOrderPage() {
  const router = useRouter();
  const { addItem } = useCart();

  const [rabUrl, setRabUrl] = useState("");
  const [items, setItems] = useState<CustomItemRow[]>([newRow()]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  function updateRow(id: string, patch: Partial<CustomItemRow>) {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setItems((prev) => [...prev, newRow()]);
  }

  function removeRow(id: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }

  const rincian = useMemo(
    () =>
      items.map((r) => ({
        row: r,
        satuan: estimateFor(r),
        subtotal: estimateFor(r) * r.qty,
      })),
    [items]
  );
  const grandTotal = rincian.reduce((s, r) => s + r.subtotal, 0);
  const totalUnit = items.reduce((s, r) => s + r.qty, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (rincian.some((r) => r.satuan <= 0)) {
      setError("Semua item harus punya ukuran (Panjang/Lebar/Tinggi) supaya estimasi harganya bisa dihitung.");
      return;
    }

    setSaving(true);
    try {
      let created = 0;
      const totalToCreate = totalUnit;
      for (const r of items) {
        for (let i = 0; i < r.qty; i++) {
          created++;
          setProgress(`Membuat item ${created} dari ${totalToCreate}...`);
          const res = await fetch("/api/products/custom", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              categoryId: r.categoryId,
              panjangCm: r.panjang,
              lebarCm: r.lebar,
              tinggiCm: r.tinggi,
              ketebalanMm: r.ketebalan,
              tingkat: r.tingkat,
              notes: r.notes,
              rabUrl: rabUrl || undefined,
            }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || "Gagal membuat salah satu item custom");
          }
          const product = await res.json();
          // Adds a real product (now visible in Katalog/Inventory too) to
          // the cart, so it can be managed with the same qty-stepper as any
          // other product instead of being an invisible cart-only line item.
          addItem(
            {
              productId: product._id,
              name: productDisplayName(product.name, product.merk),
              hargaJual: product.hargaRekomendasi,
              hargaMinimum: product.hargaMinimum,
              hargaRekomendasi: product.hargaRekomendasi,
              komisiNominal: product.komisiNominal,
              kondisi: "baru",
              stok: product.stok,
            },
            1
          );
        }
      }
      router.push("/invoice/baru");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat produk custom");
    } finally {
      setSaving(false);
      setProgress("");
    }
  }

  return (
    <>
      <PageHeader
        title="Pesan Produk Custom"
        subtitle="BISA BEBERAPA ITEM SEKALIGUS · ESTIMASI HARGA OTOMATIS BERDASARKAN UKURAN"
      />
      <div className="grid grid-cols-1 gap-5 p-6 md:p-9 lg:grid-cols-[1fr_320px]">
        <div>
          <Panel className="mb-5 p-7">
            <label className="mb-2 block font-mono text-[0.7rem] uppercase tracking-wide text-muted">
              RAB / Denah Cafe (opsional)
            </label>
            <p className="mb-3 font-sans text-[0.75rem] text-muted">
              Kalau customer bawa dokumen RAB (rencana anggaran biaya) atau denah cafe, upload di sini sebagai
              lampiran referensi. Ukuran & jumlah tiap item tetap perlu diisi manual di bawah — sistem tidak
              membaca ukuran otomatis dari file ini.
            </p>
            <UploadBox folder="rab" value={rabUrl} onChange={setRabUrl} hint="PDF/JPG/PNG, maks 5MB" />
          </Panel>

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-5">
              {items.map((r, idx) => (
                <Panel key={r.id} className="p-7">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-sans text-[0.9rem] font-extrabold">Item #{idx + 1}</h3>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(r.id)}
                        className="cursor-pointer font-sans text-[0.72rem] text-danger underline underline-offset-2"
                      >
                        Hapus item ini
                      </button>
                    )}
                  </div>
                  <FormGrid>
                    <Field label="Kategori Produk" span2>
                      <Select
                        value={r.categoryId}
                        onChange={(e) => updateRow(r.id, { categoryId: e.target.value as CustomOrderCategoryId })}
                      >
                        {CUSTOM_ORDER_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Panjang (cm)">
                      <Input type="number" value={r.panjang} onChange={(e) => updateRow(r.id, { panjang: e.target.value })} placeholder="Contoh: 120" />
                    </Field>
                    <Field label="Lebar (cm)">
                      <Input type="number" value={r.lebar} onChange={(e) => updateRow(r.id, { lebar: e.target.value })} placeholder="Contoh: 60" />
                    </Field>
                    <Field label="Tinggi (cm)">
                      <Input type="number" value={r.tinggi} onChange={(e) => updateRow(r.id, { tinggi: e.target.value })} placeholder="Contoh: 85" />
                    </Field>
                    <Field label="Ketebalan Material (mm)">
                      <Input type="number" value={r.ketebalan} onChange={(e) => updateRow(r.id, { ketebalan: e.target.value })} placeholder="Contoh: 1.2" />
                    </Field>
                    <Field label="Jumlah Tingkatan">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateRow(r.id, { tingkat: Math.max(1, r.tingkat - 1) })}
                          className="h-9 w-9 rounded-lg border border-line font-mono"
                        >
                          −
                        </button>
                        <Input readOnly value={r.tingkat} className="text-center" />
                        <button
                          type="button"
                          onClick={() => updateRow(r.id, { tingkat: r.tingkat + 1 })}
                          className="h-9 w-9 rounded-lg border border-line font-mono"
                        >
                          +
                        </button>
                      </div>
                    </Field>
                    <Field label="Jumlah Unit (qty)" hint="Item identik dengan ukuran ini, dibuat sebagai unit terpisah">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateRow(r.id, { qty: Math.max(1, r.qty - 1) })}
                          className="h-9 w-9 rounded-lg border border-line font-mono"
                        >
                          −
                        </button>
                        <Input readOnly value={r.qty} className="text-center" />
                        <button
                          type="button"
                          onClick={() => updateRow(r.id, { qty: r.qty + 1 })}
                          className="h-9 w-9 rounded-lg border border-line font-mono"
                        >
                          +
                        </button>
                      </div>
                    </Field>
                    <Field label="Catatan Tambahan (opsional)" span2>
                      <Textarea
                        rows={2}
                        value={r.notes}
                        onChange={(e) => updateRow(r.id, { notes: e.target.value })}
                        placeholder="Detail permintaan khusus, misal: perlu roda, laci tambahan, dll..."
                      />
                    </Field>
                  </FormGrid>
                  <div className="mt-4 border-t border-dashed border-line pt-3 text-right font-mono text-[0.85rem]">
                    Estimasi: <b>{rupiah(estimateFor(r))}</b> / unit
                    {r.qty > 1 && <> × {r.qty} = <b>{rupiah(estimateFor(r) * r.qty)}</b></>}
                  </div>
                </Panel>
              ))}
            </div>

            <button
              type="button"
              onClick={addRow}
              className="mt-4 w-full cursor-pointer border-[1.5px] border-dashed border-line py-3 text-center font-sans text-[0.85rem] text-muted hover:border-accent hover:text-accent-700"
            >
              + Tambah Item
            </button>

            {error && <div className="mt-4 font-mono text-[0.75rem] text-danger">{error}</div>}

            <FormActions>
              <Button type="submit" disabled={saving}>
                {saving ? progress || "Menyimpan..." : `Ajukan Semua (${totalUnit} unit) & Lanjut ke Invoice`}
              </Button>
              <LinkButton variant="ghost" href="/katalog">
                Batal
              </LinkButton>
            </FormActions>
          </form>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="border border-line bg-panel p-5">
            <h3 className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">Rincian Biaya</h3>
            <div className="mt-3 flex flex-col gap-2.5">
              {rincian.map(({ row, satuan, subtotal }, idx) => (
                <div key={row.id} className="border-b border-dashed border-line pb-2.5 font-mono text-[0.75rem] last:border-0">
                  <div className="flex justify-between">
                    <span>
                      #{idx + 1} {CUSTOM_ORDER_CATEGORIES.find((c) => c.id === row.categoryId)?.label}
                      {row.qty > 1 ? ` ×${row.qty}` : ""}
                    </span>
                    <span className="font-semibold">{rupiah(subtotal)}</span>
                  </div>
                  <div className="text-muted">
                    {row.panjang || "—"}×{row.lebar || "—"}×{row.tinggi || "—"} cm
                    {satuan <= 0 && <span className="text-danger"> · ukuran belum lengkap</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t-2 border-ink pt-3 font-serif text-lg font-semibold">
              <span>Total</span>
              <span>{rupiah(grandTotal)}</span>
            </div>
            <div className="mt-1.5 font-mono text-[0.7rem] text-muted">
              Estimasi kasar — harga final dikonfirmasi tim produksi setelah pengecekan detail
            </div>
          </div>
          <div className="border border-line bg-[#f7f5ee] p-5">
            <h3 className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">Cara Perhitungan</h3>
            <div className="mt-3 font-mono text-[0.75rem] leading-relaxed text-muted">
              Volume (P × L × T) ÷ 100.000
              <br />
              × Tarif dasar kategori
              <br />× Pengali ketebalan & tingkat
            </div>
          </div>
          <div className="border border-line bg-panel p-5">
            <h3 className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">Alur Berikutnya</h3>
            <div className="mt-3 font-mono text-[0.75rem] leading-relaxed text-muted">
              • Tiap item custom otomatis masuk ke Katalog & Inventory juga
              <br />• Bisa ditambah/dihapus dari invoice seperti produk biasa
              <br />• Pelanggan sudah terisi otomatis di halaman Buat Invoice
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
