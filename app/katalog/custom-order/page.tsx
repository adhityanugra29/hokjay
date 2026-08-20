"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input, Select, Textarea } from "@/components/ui/Form";
import { Button, LinkButton } from "@/components/ui/Button";
import { useCart } from "@/components/cart/CartProvider";
import RequireActiveCustomer from "@/components/penjualan/RequireActiveCustomer";
import { CUSTOM_ORDER_CATEGORIES, type CustomOrderCategoryId } from "@/lib/constants";
import { customOrderEstimate } from "@/lib/pricing";
import { rupiah } from "@/lib/format";

export default function CustomOrderPage() {
  const router = useRouter();
  const { addItem } = useCart();

  const [categoryId, setCategoryId] = useState<CustomOrderCategoryId>("meja");
  const [panjang, setPanjang] = useState("");
  const [lebar, setLebar] = useState("");
  const [tinggi, setTinggi] = useState("");
  const [ketebalan, setKetebalan] = useState("1");
  const [tingkat, setTingkat] = useState(1);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estimate = useMemo(
    () =>
      customOrderEstimate({
        categoryId,
        panjangCm: Number(panjang),
        lebarCm: Number(lebar),
        tinggiCm: Number(tinggi),
        ketebalanMm: Number(ketebalan),
        tingkat,
      }),
    [categoryId, panjang, lebar, tinggi, ketebalan, tingkat]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/products/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          panjangCm: panjang,
          lebarCm: lebar,
          tinggiCm: tinggi,
          ketebalanMm: ketebalan,
          tingkat,
          notes,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal membuat produk custom");
      }
      const product = await res.json();
      // Adds a real product (now visible in Katalog/Inventory too) to the
      // cart, so it can be managed with the same qty-stepper as any other
      // product instead of being an invisible cart-only line item.
      addItem(
        {
          productId: product._id,
          name: product.name,
          hargaJual: product.hargaRekomendasi,
          hargaMinimum: product.hargaMinimum,
          komisiNominal: product.komisiNominal,
          kondisi: "baru",
          stok: product.stok,
        },
        1
      );
      router.push("/invoice/baru");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat produk custom");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireActiveCustomer>
      <PageHeader title="Pesan Produk Custom" subtitle="ESTIMASI HARGA OTOMATIS BERDASARKAN UKURAN & MATERIAL" />
      <div className="grid grid-cols-1 gap-5 p-6 md:p-9 lg:grid-cols-[1fr_320px]">
        <Panel className="p-7">
          <form onSubmit={handleSubmit}>
            <FormGrid>
              <Field label="Kategori Produk" span2>
                <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value as CustomOrderCategoryId)}>
                  {CUSTOM_ORDER_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Panjang (cm)">
                <Input type="number" value={panjang} onChange={(e) => setPanjang(e.target.value)} placeholder="Contoh: 120" />
              </Field>
              <Field label="Lebar (cm)">
                <Input type="number" value={lebar} onChange={(e) => setLebar(e.target.value)} placeholder="Contoh: 60" />
              </Field>
              <Field label="Tinggi (cm)">
                <Input type="number" value={tinggi} onChange={(e) => setTinggi(e.target.value)} placeholder="Contoh: 85" />
              </Field>
              <Field label="Ketebalan Material (mm)">
                <Input type="number" value={ketebalan} onChange={(e) => setKetebalan(e.target.value)} placeholder="Contoh: 1.2" />
              </Field>
              <Field label="Jumlah Tingkatan">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTingkat((t) => Math.max(1, t - 1))}
                    className="h-9 w-9 rounded border border-line font-mono"
                  >
                    −
                  </button>
                  <Input readOnly value={tingkat} className="text-center" />
                  <button
                    type="button"
                    onClick={() => setTingkat((t) => t + 1)}
                    className="h-9 w-9 rounded border border-line font-mono"
                  >
                    +
                  </button>
                </div>
              </Field>
              <Field label="Catatan Tambahan (opsional)" span2>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detail permintaan khusus, misal: perlu roda, laci tambahan, dll..."
                />
              </Field>
            </FormGrid>

            {error && <div className="mt-3 font-mono text-[0.75rem] text-danger">{error}</div>}

            <FormActions>
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : "Ajukan & Lanjut ke Invoice"}
              </Button>
              <LinkButton variant="ghost" href="/katalog">
                Batal
              </LinkButton>
            </FormActions>
          </form>
        </Panel>

        <div className="flex flex-col gap-3.5">
          <div className="border border-line bg-[#f7f5ee] p-5">
            <h3 className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">Estimasi Harga</h3>
            <div className="mt-1.5 font-serif text-3xl font-semibold text-moss-deep">{rupiah(estimate)}</div>
            <div className="mt-1.5 font-mono text-[0.72rem] text-muted">
              Estimasi kasar — harga final dikonfirmasi tim produksi setelah pengecekan detail
            </div>
          </div>
          <div className="border border-line bg-panel p-5">
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
              • Item custom ini otomatis masuk ke Katalog & Inventory juga
              <br />• Bisa ditambah/dihapus dari invoice seperti produk biasa
              <br />• Pelanggan sudah terisi otomatis di halaman Buat Invoice
            </div>
          </div>
        </div>
      </div>
    </RequireActiveCustomer>
  );
}
