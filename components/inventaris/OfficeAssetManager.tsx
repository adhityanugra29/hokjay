"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input, Select, Textarea } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { RowActionButton } from "@/components/ui/RowAction";
import Pill from "@/components/ui/Pill";
import { rupiah, formatDateShort } from "@/lib/format";
import { nilaiBuku } from "@/lib/depresiasi";

interface AssetRow {
  _id: string;
  kodeAset?: string;
  nama: string;
  kategori: "peralatan" | "habis_pakai";
  qty: number;
  satuan?: string;
  pemegang?: string;
  lokasi?: string;
  kondisi?: "baik" | "perlu_servis" | "rusak";
  hargaPerolehan?: number;
  tanggalPerolehan: string;
  umurEkonomisBulan?: number;
  dihapusBuku?: boolean;
  sumberBillNomor?: string;
  catatan?: string;
}

const KATEGORI_LABEL: Record<string, string> = { peralatan: "Peralatan", habis_pakai: "Habis Pakai" };
const KONDISI_LABEL: Record<string, string> = { baik: "Baik", perlu_servis: "Servis", rusak: "Rusak" };
const KONDISI_PILL: Record<string, "ok" | "low" | "out"> = { baik: "ok", perlu_servis: "low", rusak: "out" };

const BLANK = {
  nama: "",
  kategori: "peralatan" as "peralatan" | "habis_pakai",
  qty: "1",
  satuan: "unit",
  pemegang: "",
  lokasi: "",
  kondisi: "baik" as "baik" | "perlu_servis" | "rusak",
  hargaPerolehan: "",
  umurEkonomisBulan: "48",
  catatan: "",
};

/**
 * "Inventaris Kantor" — design "6c" (confirmed with the user 2026-08-24):
 * who's holding it and what it's worth right now, not "how many left".
 * Nilai buku is computed client-side via lib/depresiasi.ts's pure
 * straight-line formula (same function the server summary uses) so it
 * always matches without an extra round trip.
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
      pemegang: a.pemegang ?? "",
      lokasi: a.lokasi ?? "",
      kondisi: a.kondisi ?? "baik",
      hargaPerolehan: a.hargaPerolehan !== undefined ? String(a.hargaPerolehan) : "",
      umurEkonomisBulan: String(a.umurEkonomisBulan ?? 48),
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

  async function hapusBuku(a: AssetRow) {
    if (!confirm(`Hapus buku "${a.nama}"? Nilai bukunya jadi 0 dan aset ini keluar dari daftar Perlu Tindakan.`)) return;
    setAssets((prev) => prev.map((x) => (x._id === a._id ? { ...x, dihapusBuku: true } : x)));
    await fetch(`/api/office-assets/${a._id}/hapus-buku`, { method: "POST" });
  }

  const rowsWithNilaiBuku = useMemo(
    () => assets.map((a) => ({ ...a, _nilaiBuku: nilaiBuku(a) })).sort((a, b) => {
      const aAction = !a.dihapusBuku && (a.kondisi === "perlu_servis" || a.kondisi === "rusak") ? 1 : 0;
      const bAction = !b.dihapusBuku && (b.kondisi === "perlu_servis" || b.kondisi === "rusak") ? 1 : 0;
      return bAction - aAction;
    }),
    [assets]
  );
  const perluTindakan = rowsWithNilaiBuku.filter((a) => !a.dihapusBuku && (a.kondisi === "perlu_servis" || a.kondisi === "rusak"));
  const totalHargaBeli = assets.reduce((s, a) => s + (a.hargaPerolehan ?? 0), 0);
  const totalNilaiBuku = rowsWithNilaiBuku.reduce((s, a) => s + a._nilaiBuku, 0);

  return (
    <>
      <Panel>
        <PanelHead title="Daftar Aset — perlu tindakan di atas">
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
              <Field label="Kategori" hint="Peralatan = aset jangka panjang (disusutkan). Habis Pakai = consumable, tidak dihitung sebagai aset.">
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
              <Field label="Pemegang (opsional)" hint="Siapa yang pegang/pakai sekarang.">
                <Input value={values.pemegang} onChange={(e) => setValues((v) => ({ ...v, pemegang: e.target.value }))} placeholder="Nama karyawan / sales..." />
              </Field>
              <Field label="Lokasi (opsional)">
                <Input value={values.lokasi} onChange={(e) => setValues((v) => ({ ...v, lokasi: e.target.value }))} placeholder="Gudang, Kantor Depan..." />
              </Field>
              <Field label="Harga Perolehan (opsional)">
                <Input type="number" min={0} value={values.hargaPerolehan} onChange={(e) => setValues((v) => ({ ...v, hargaPerolehan: e.target.value }))} />
              </Field>
              {values.kategori === "peralatan" && (
                <Field label="Umur Ekonomis (bulan)" hint="Dipakai untuk hitung penyusutan garis lurus.">
                  <Input type="number" min={1} value={values.umurEkonomisBulan} onChange={(e) => setValues((v) => ({ ...v, umurEkonomisBulan: e.target.value }))} />
                </Field>
              )}
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
                <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">Aset</th>
                <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">Pemegang · Lokasi</th>
                <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">Beli</th>
                <th className="whitespace-nowrap border-b border-line px-5 py-4 text-right font-sans text-[0.8rem] font-medium text-muted">Harga Beli</th>
                <th className="whitespace-nowrap border-b border-line px-5 py-4 text-right font-sans text-[0.8rem] font-medium text-muted">Nilai Buku</th>
                <th className="whitespace-nowrap border-b border-line px-5 py-4 text-right font-sans text-[0.8rem] font-medium text-muted">Kondisi</th>
                <th className="border-b border-line px-5 py-4" />
              </tr>
            </thead>
            <tbody>
              {rowsWithNilaiBuku.map((a) => (
                <Fragment key={a._id}>
                  <tr className={`hover:bg-[#fbfaf5] ${a.dihapusBuku ? "opacity-50" : ""}`}>
                    <td className="border-b border-line px-5 py-4.5 font-medium">
                      {a.nama}
                      <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[0.68rem] text-muted">
                        {a.kodeAset && <span>{a.kodeAset}</span>}
                        <span
                          className={`inline-block px-1.5 py-0.5 font-sans text-[0.62rem] font-semibold ${
                            a.kategori === "peralatan" ? "bg-[#e9e5f5] text-[#4a3d8f]" : "bg-[#fdead0] text-[#a5620a]"
                          }`}
                        >
                          {KATEGORI_LABEL[a.kategori]}
                        </span>
                      </div>
                    </td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.78rem] text-muted">
                      {a.pemegang || "—"}
                      {a.lokasi && <div className="text-[0.68rem]">{a.lokasi}</div>}
                    </td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.75rem] text-muted">
                      {formatDateShort(a.tanggalPerolehan)}
                    </td>
                    <td className="border-b border-line px-5 py-4.5 text-right font-mono text-[0.78rem] text-muted">
                      {a.hargaPerolehan ? rupiah(a.hargaPerolehan) : "—"}
                    </td>
                    <td className="border-b border-line px-5 py-4.5 text-right font-mono text-[0.8rem] font-medium">
                      {a.kategori === "peralatan" ? rupiah(a._nilaiBuku) : "—"}
                    </td>
                    <td className="border-b border-line px-5 py-4.5 text-right">
                      {a.dihapusBuku ? (
                        <Pill variant="out">Dihapus Buku</Pill>
                      ) : (
                        <Pill variant={KONDISI_PILL[a.kondisi ?? "baik"]}>{KONDISI_LABEL[a.kondisi ?? "baik"]}</Pill>
                      )}
                    </td>
                    <td className="border-b border-line px-5 py-4.5">
                      <div className="flex flex-wrap justify-end gap-2">
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
                            <Field label="Pemegang">
                              <Input value={editValues.pemegang} onChange={(e) => setEditValues((v) => ({ ...v, pemegang: e.target.value }))} />
                            </Field>
                            <Field label="Lokasi">
                              <Input value={editValues.lokasi} onChange={(e) => setEditValues((v) => ({ ...v, lokasi: e.target.value }))} />
                            </Field>
                            <Field label="Harga Perolehan">
                              <Input type="number" min={0} value={editValues.hargaPerolehan} onChange={(e) => setEditValues((v) => ({ ...v, hargaPerolehan: e.target.value }))} />
                            </Field>
                            {editValues.kategori === "peralatan" && (
                              <Field label="Umur Ekonomis (bulan)">
                                <Input type="number" min={1} value={editValues.umurEkonomisBulan} onChange={(e) => setEditValues((v) => ({ ...v, umurEkonomisBulan: e.target.value }))} />
                              </Field>
                            )}
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
            {assets.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3} className="border-t-2 border-ink px-5 py-4 text-right font-bold">
                    Total {assets.length} aset
                  </td>
                  <td className="border-t-2 border-ink px-5 py-4 text-right font-mono font-bold">{rupiah(totalHargaBeli)}</td>
                  <td className="border-t-2 border-ink px-5 py-4 text-right font-mono font-bold">{rupiah(totalNilaiBuku)}</td>
                  <td colSpan={2} className="border-t-2 border-ink px-5 py-4" />
                </tr>
              </tfoot>
            )}
          </table>
        </TableScroll>
      </Panel>

      {perluTindakan.length > 0 && (
        <Panel className="mt-5">
          <PanelHead title="Perlu Tindakan" />
          <div className="divide-y divide-line">
            {perluTindakan.map((a) => (
              <div key={a._id} className="flex items-center justify-between gap-3 px-5 py-3.5 text-[0.85rem]">
                <span>
                  <b>{a.nama}</b>{" "}
                  <span className="font-mono text-[0.72rem] text-muted">
                    {a.kondisi === "rusak" ? `— rusak, nilai buku ${rupiah(a._nilaiBuku)}` : "— perlu servis"}
                  </span>
                </span>
                <div className="flex gap-2">
                  <RowActionButton onClick={() => startEdit(a)}>Jadwalkan</RowActionButton>
                  {a.kondisi === "rusak" && <RowActionButton onClick={() => hapusBuku(a)}>Hapus Buku</RowActionButton>}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div className="mt-5 border-l-4 border-line pl-3.5 font-mono text-[0.72rem] leading-relaxed text-muted">
        Nilai buku dihitung otomatis (penyusutan garis lurus per bulan) — bukan angka manual. Aset yang dibawa
        keluar kantor sebaiknya diisi Pemegang-nya di sini.
      </div>
    </>
  );
}
