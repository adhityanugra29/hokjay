"use client";

import { Fragment, useEffect, useState } from "react";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input, Select, Textarea } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { RowActionButton } from "@/components/ui/RowAction";
import { rupiah, formatDateShort } from "@/lib/format";

interface AssetRow {
  _id: string;
  nama: string;
  kategori: "peralatan" | "habis_pakai";
  qty: number;
  satuan?: string;
  lokasi?: string;
  kondisi?: "baik" | "perlu_servis" | "rusak";
  hargaPerolehan?: number;
  tanggalPerolehan: string;
  sumberBillNomor?: string;
  catatan?: string;
}

const KATEGORI_LABEL: Record<string, string> = { peralatan: "Peralatan", habis_pakai: "Habis Pakai" };
const KONDISI_LABEL: Record<string, string> = { baik: "Baik", perlu_servis: "Perlu Servis", rusak: "Rusak" };

const BLANK = {
  nama: "",
  kategori: "peralatan" as "peralatan" | "habis_pakai",
  qty: "1",
  satuan: "unit",
  lokasi: "",
  kondisi: "baik" as "baik" | "perlu_servis" | "rusak",
  hargaPerolehan: "",
  catatan: "",
};

/**
 * "Inventaris Kantor" — separate register from /produk (the sales
 * catalog). `kategori` is the required Peralatan-vs-Habis-Pakai
 * distinction the user asked for — Peralatan counts toward standing
 * asset value below, Habis Pakai never does even though it's still
 * logged here for spend visibility. See confirmation with the user
 * 2026-08-22. Moved out from under Purchasing into its own standalone
 * nav section 2026-08-23 (was components/purchasing/OfficeAssetManager.tsx).
 */
export default function OfficeAssetManager({ prefillFromBill }: { prefillFromBill?: { _id: string; nomor: string; namaBarang: string; qty: number; totalTagihan: number } }) {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(!!prefillFromBill);
  const [values, setValues] = useState(() =>
    prefillFromBill
      ? { ...BLANK, nama: prefillFromBill.namaBarang, qty: String(prefillFromBill.qty), hargaPerolehan: String(prefillFromBill.totalTagihan) }
      : BLANK
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState(BLANK);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/office-assets");
    setAssets(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/office-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          hargaPerolehan: values.hargaPerolehan || undefined,
          sumberBill: prefillFromBill?._id,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal menambah aset");
      }
      setValues(BLANK);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah aset");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(a: AssetRow) {
    setEditingId(a._id);
    setEditValues({
      nama: a.nama,
      kategori: a.kategori,
      qty: String(a.qty),
      satuan: a.satuan ?? "unit",
      lokasi: a.lokasi ?? "",
      kondisi: a.kondisi ?? "baik",
      hargaPerolehan: a.hargaPerolehan !== undefined ? String(a.hargaPerolehan) : "",
      catatan: a.catatan ?? "",
    });
    setEditError(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/office-assets/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editValues, hargaPerolehan: editValues.hargaPerolehan || "" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal memperbarui aset");
      }
      setEditingId(null);
      load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Gagal memperbarui aset");
    } finally {
      setEditSaving(false);
    }
  }

  async function removeAsset(id: string) {
    setAssets((prev) => prev.filter((a) => a._id !== id));
    await fetch(`/api/office-assets/${id}`, { method: "DELETE" });
  }

  const peralatan = assets.filter((a) => a.kategori === "peralatan");
  const habisPakai = assets.filter((a) => a.kategori === "habis_pakai");
  const totalNilaiPeralatan = peralatan.reduce((s, a) => s + (a.hargaPerolehan ?? 0), 0);

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3.5 lg:grid-cols-3">
        <div className="border-2 border-ink bg-panel p-4.5">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Total Nilai Peralatan
          </div>
          <div className="mt-1.5 font-sans text-[1.4rem] font-extrabold">{rupiah(totalNilaiPeralatan)}</div>
        </div>
        <div className="border-2 border-line bg-panel p-4.5">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Jumlah Peralatan
          </div>
          <div className="mt-1.5 font-sans text-[1.4rem] font-extrabold">{peralatan.length}</div>
        </div>
        <div className="border-2 border-line bg-panel p-4.5">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Barang Habis Pakai Tercatat
          </div>
          <div className="mt-1.5 font-sans text-[1.4rem] font-extrabold">{habisPakai.length}</div>
        </div>
      </div>

      <Panel>
        <PanelHead title="Inventaris Kantor">
          <Button type="button" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Batal" : "+ Tambah Aset"}
          </Button>
        </PanelHead>

        {showForm && (
          <form onSubmit={handleSubmit} className="border-b-2 border-line p-5">
            {prefillFromBill && (
              <div className="mb-4 border border-line bg-[#f7f5ee] p-3 font-mono text-[0.72rem] text-muted">
                Dicatat dari Material Order <span className="font-semibold text-ink">{prefillFromBill.nomor}</span>.
              </div>
            )}
            <FormGrid>
              <Field label="Nama Barang" span2>
                <Input required value={values.nama} onChange={(e) => setValues((v) => ({ ...v, nama: e.target.value }))} />
              </Field>
              <Field label="Kategori" hint="Peralatan = aset jangka panjang. Habis Pakai = consumable, tidak dihitung sebagai aset.">
                <Select value={values.kategori} onChange={(e) => setValues((v) => ({ ...v, kategori: e.target.value as "peralatan" | "habis_pakai" }))}>
                  <option value="peralatan">Peralatan (Aset)</option>
                  <option value="habis_pakai">Habis Pakai (Consumable)</option>
                </Select>
              </Field>
              <Field label="Kondisi">
                <Select value={values.kondisi} onChange={(e) => setValues((v) => ({ ...v, kondisi: e.target.value as typeof values.kondisi }))}>
                  <option value="baik">Baik</option>
                  <option value="perlu_servis">Perlu Servis</option>
                  <option value="rusak">Rusak</option>
                </Select>
              </Field>
              <Field label="Qty">
                <Input required type="number" min={1} value={values.qty} onChange={(e) => setValues((v) => ({ ...v, qty: e.target.value }))} />
              </Field>
              <Field label="Satuan">
                <Input value={values.satuan} onChange={(e) => setValues((v) => ({ ...v, satuan: e.target.value }))} placeholder="unit, box, rim..." />
              </Field>
              <Field label="Lokasi (opsional)">
                <Input value={values.lokasi} onChange={(e) => setValues((v) => ({ ...v, lokasi: e.target.value }))} placeholder="Gudang, Kantor Depan..." />
              </Field>
              <Field label="Harga Perolehan (opsional)">
                <Input type="number" min={0} value={values.hargaPerolehan} onChange={(e) => setValues((v) => ({ ...v, hargaPerolehan: e.target.value }))} />
              </Field>
              <Field label="Catatan (opsional)" span2>
                <Textarea rows={2} value={values.catatan} onChange={(e) => setValues((v) => ({ ...v, catatan: e.target.value }))} />
              </Field>
            </FormGrid>
            {error && <div className="mt-3 font-mono text-[0.75rem] text-danger">{error}</div>}
            <FormActions>
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan Aset"}
              </Button>
            </FormActions>
          </form>
        )}

        <TableScroll>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">Nama</th>
                <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">Kategori</th>
                <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">Qty</th>
                <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">Kondisi</th>
                <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">Nilai</th>
                <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">Diperoleh</th>
                <th className="border-b border-line px-5 py-4" />
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <Fragment key={a._id}>
                  <tr className="hover:bg-[#fbfaf5]">
                    <td className="border-b border-line px-5 py-4.5 font-medium">
                      {a.nama}
                      {a.lokasi && <div className="font-mono text-[0.68rem] text-muted">{a.lokasi}</div>}
                    </td>
                    <td className="border-b border-line px-5 py-4.5">
                      <span
                        className={`inline-block px-2.5 py-1 font-sans text-[0.68rem] font-semibold ${
                          a.kategori === "peralatan" ? "bg-[#e9e5f5] text-[#4a3d8f]" : "bg-[#fdead0] text-[#a5620a]"
                        }`}
                      >
                        {KATEGORI_LABEL[a.kategori]}
                      </span>
                    </td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                      {a.qty} {a.satuan}
                    </td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.78rem] text-muted">
                      {KONDISI_LABEL[a.kondisi ?? "baik"]}
                    </td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                      {a.hargaPerolehan ? rupiah(a.hargaPerolehan) : "—"}
                    </td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.75rem] text-muted">
                      {formatDateShort(a.tanggalPerolehan)}
                      {a.sumberBillNomor && <div className="text-[0.68rem]">dari {a.sumberBillNomor}</div>}
                    </td>
                    <td className="border-b border-line px-5 py-4.5">
                      <div className="flex flex-wrap gap-2">
                        <RowActionButton onClick={() => (editingId === a._id ? setEditingId(null) : startEdit(a))}>
                          {editingId === a._id ? "Batal" : "Edit"}
                        </RowActionButton>
                        <RowActionButton onClick={() => removeAsset(a._id)}>Hapus</RowActionButton>
                      </div>
                    </td>
                  </tr>
                  {editingId === a._id && (
                    <tr>
                      <td colSpan={7} className="border-b border-line bg-[#f7f5ee] p-5">
                        <form onSubmit={handleEditSubmit}>
                          <FormGrid>
                            <Field label="Nama Barang" span2>
                              <Input required value={editValues.nama} onChange={(e) => setEditValues((v) => ({ ...v, nama: e.target.value }))} />
                            </Field>
                            <Field label="Kategori">
                              <Select value={editValues.kategori} onChange={(e) => setEditValues((v) => ({ ...v, kategori: e.target.value as "peralatan" | "habis_pakai" }))}>
                                <option value="peralatan">Peralatan (Aset)</option>
                                <option value="habis_pakai">Habis Pakai (Consumable)</option>
                              </Select>
                            </Field>
                            <Field label="Kondisi">
                              <Select value={editValues.kondisi} onChange={(e) => setEditValues((v) => ({ ...v, kondisi: e.target.value as typeof editValues.kondisi }))}>
                                <option value="baik">Baik</option>
                                <option value="perlu_servis">Perlu Servis</option>
                                <option value="rusak">Rusak</option>
                              </Select>
                            </Field>
                            <Field label="Qty">
                              <Input required type="number" min={1} value={editValues.qty} onChange={(e) => setEditValues((v) => ({ ...v, qty: e.target.value }))} />
                            </Field>
                            <Field label="Satuan">
                              <Input value={editValues.satuan} onChange={(e) => setEditValues((v) => ({ ...v, satuan: e.target.value }))} />
                            </Field>
                            <Field label="Lokasi">
                              <Input value={editValues.lokasi} onChange={(e) => setEditValues((v) => ({ ...v, lokasi: e.target.value }))} />
                            </Field>
                            <Field label="Harga Perolehan">
                              <Input type="number" min={0} value={editValues.hargaPerolehan} onChange={(e) => setEditValues((v) => ({ ...v, hargaPerolehan: e.target.value }))} />
                            </Field>
                            <Field label="Catatan" span2>
                              <Textarea rows={2} value={editValues.catatan} onChange={(e) => setEditValues((v) => ({ ...v, catatan: e.target.value }))} />
                            </Field>
                          </FormGrid>
                          {editError && <div className="mt-3 font-mono text-[0.75rem] text-danger">{editError}</div>}
                          <FormActions>
                            <Button type="submit" disabled={editSaving}>
                              {editSaving ? "Menyimpan..." : "Simpan Perubahan"}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>
                              Batal
                            </Button>
                          </FormActions>
                        </form>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {!loading && assets.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center font-mono text-sm text-muted">
                    Belum ada aset kantor tercatat.
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
