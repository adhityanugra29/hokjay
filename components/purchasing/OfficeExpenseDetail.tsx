"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input, Textarea } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import UploadBox from "@/components/ui/UploadBox";
import { rupiah, formatDateFull } from "@/lib/format";
import { isAdminLevel } from "@/lib/auth/access";
import type { UserRole } from "@/models/User";

export interface OfficeExpenseData {
  _id: string;
  nama: string;
  kategori: string;
  jumlah: number;
  alasan?: string;
  diajukanOleh?: string;
  createdAt: string;
  status: "diajukan" | "disetujui" | "ditolak" | "dibayar" | "selesai";
  disetujuiOleh?: string;
  disetujuiTanggal?: string;
  alasanTolak?: string;
  buktiTransferUrl?: string;
  buktiTransferTanggal?: string;
  buktiTransferNominal?: number;
  buktiTransferOleh?: string;
  buktiBerhasilUrl?: string;
  buktiBerhasilCatatan?: string;
  buktiBerhasilTanggal?: string;
  buktiBerhasilOleh?: string;
}

const KATEGORI_LABEL: Record<string, string> = {
  listrik: "Listrik",
  internet: "Internet / WiFi",
  pulsa: "Pulsa",
  lainnya: "Lainnya",
};

export default function OfficeExpenseDetail({ data, role }: { data: OfficeExpenseData; role: UserRole }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Approve/reject
  const [alasanTolak, setAlasanTolak] = useState("");
  const [showTolak, setShowTolak] = useState(false);

  // Bukti transfer
  const [nominalTransfer, setNominalTransfer] = useState(String(data.jumlah));
  const [tanggalTransfer, setTanggalTransfer] = useState(() => new Date().toISOString().slice(0, 10));
  const [buktiTransferUrl, setBuktiTransferUrl] = useState("");

  // Bukti berhasil
  const [buktiBerhasilUrl, setBuktiBerhasilUrl] = useState("");
  const [catatanBerhasil, setCatatanBerhasil] = useState("");

  async function post(url: string, body: unknown) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || "Gagal memproses");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <Panel className="p-7">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Kategori">
            <div className="font-sans text-[0.95rem] font-semibold">{KATEGORI_LABEL[data.kategori] ?? data.kategori}</div>
          </Field>
          <Field label="Jumlah Diajukan">
            <div className="font-sans text-[0.95rem] font-semibold">{rupiah(data.jumlah)}</div>
          </Field>
          <Field label="Diajukan Oleh">
            <div className="font-mono text-[0.85rem] text-muted">{data.diajukanOleh ?? "—"}</div>
          </Field>
          <Field label="Tanggal Diajukan">
            <div className="font-mono text-[0.85rem] text-muted">{formatDateFull(data.createdAt)}</div>
          </Field>
          {data.alasan && (
            <div className="col-span-2">
              <Field label="Alasan / Catatan">
                <div className="font-sans text-[0.85rem]">{data.alasan}</div>
              </Field>
            </div>
          )}
        </div>
      </Panel>

      {/* Stage: menunggu approval */}
      {data.status === "diajukan" && (
        <Panel className="mt-5 p-7">
          <div className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">Status</div>
          <div className="mt-1 font-sans text-[1.1rem] font-bold text-accent-700">Menunggu Approval</div>

          {isAdminLevel(role) ? (
            <div className="mt-5">
              {!showTolak ? (
                <div className="flex flex-wrap gap-2.5">
                  <Button onClick={() => post(`/api/office-expenses/${data._id}/approve`, { approved: true })} disabled={saving}>
                    {saving ? "Memproses..." : "Setujui"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowTolak(true)} disabled={saving}>
                    Tolak
                  </Button>
                </div>
              ) : (
                <div>
                  <Field label="Alasan Penolakan">
                    <Textarea rows={2} value={alasanTolak} onChange={(e) => setAlasanTolak(e.target.value)} />
                  </Field>
                  <FormActions>
                    <Button
                      variant="clay"
                      disabled={saving}
                      onClick={() => post(`/api/office-expenses/${data._id}/approve`, { approved: false, alasanTolak })}
                    >
                      {saving ? "Memproses..." : "Konfirmasi Tolak"}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowTolak(false)}>
                      Batal
                    </Button>
                  </FormActions>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 font-mono text-[0.75rem] text-muted">Menunggu persetujuan dari Admin.</div>
          )}
          {error && <div className="mt-3 font-mono text-[0.75rem] text-danger">{error}</div>}
        </Panel>
      )}

      {/* Stage: ditolak */}
      {data.status === "ditolak" && (
        <Panel className="mt-5 p-7">
          <div className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">Status</div>
          <div className="mt-1 font-sans text-[1.1rem] font-bold text-accent-700">Ditolak</div>
          <div className="mt-3 border-l-4 border-accent bg-[#f7f5ee] p-4 font-sans text-[0.85rem]">
            <b>Alasan:</b> {data.alasanTolak}
          </div>
          <div className="mt-2 font-mono text-[0.72rem] text-muted">
            oleh {data.disetujuiOleh} · {data.disetujuiTanggal && formatDateFull(data.disetujuiTanggal)}
          </div>
        </Panel>
      )}

      {/* Stage: disetujui -> upload bukti transfer */}
      {data.status === "disetujui" && (
        <Panel className="mt-5 p-7">
          <div className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">Status</div>
          <div className="mt-1 font-sans text-[1.1rem] font-bold text-moss-deep">
            Disetujui oleh {data.disetujuiOleh}
          </div>
          <div className="mt-5 border-t border-line pt-5">
            <div className="mb-3 font-mono text-[0.7rem] uppercase tracking-wide text-muted">Upload Bukti Transfer</div>
            <FormGrid>
              <Field label="Nominal Transfer">
                <Input type="number" min={1} value={nominalTransfer} onChange={(e) => setNominalTransfer(e.target.value)} />
              </Field>
              <Field label="Tanggal Transfer">
                <Input type="date" value={tanggalTransfer} onChange={(e) => setTanggalTransfer(e.target.value)} />
              </Field>
              <Field label="Bukti Transfer" span2>
                <UploadBox folder="purchasing" value={buktiTransferUrl} onChange={setBuktiTransferUrl} />
              </Field>
            </FormGrid>
            {error && <div className="mt-3 font-mono text-[0.75rem] text-danger">{error}</div>}
            <FormActions>
              <Button
                disabled={saving}
                onClick={() =>
                  post(`/api/office-expenses/${data._id}/transfer`, {
                    nominal: Number(nominalTransfer) || 0,
                    tanggal: tanggalTransfer,
                    buktiUrl: buktiTransferUrl,
                  })
                }
              >
                {saving ? "Menyimpan..." : "Simpan Bukti Transfer"}
              </Button>
            </FormActions>
          </div>
        </Panel>
      )}

      {/* Stage: dibayar -> upload bukti berhasil */}
      {data.status === "dibayar" && (
        <Panel className="mt-5 p-7">
          <div className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">Bukti Transfer</div>
          <div className="mt-1 font-sans text-[0.95rem] font-semibold">{rupiah(data.buktiTransferNominal ?? 0)}</div>
          <div className="mt-1 font-mono text-[0.72rem] text-muted">
            oleh {data.buktiTransferOleh} · {data.buktiTransferTanggal && formatDateFull(data.buktiTransferTanggal)}
          </div>
          {data.buktiTransferUrl && (
            <a href={data.buktiTransferUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-accent-700 underline underline-offset-2">
              Lihat bukti transfer
            </a>
          )}

          <div className="mt-5 border-t border-line pt-5">
            <div className="mb-3 font-mono text-[0.7rem] uppercase tracking-wide text-muted">
              Upload Bukti Pembelian Berhasil
            </div>
            <FormGrid>
              <Field label="Bukti (mis. token listrik, konfirmasi aktivasi)" span2>
                <UploadBox folder="purchasing" value={buktiBerhasilUrl} onChange={setBuktiBerhasilUrl} />
              </Field>
              <Field label="Catatan (opsional)" span2>
                <Textarea rows={2} value={catatanBerhasil} onChange={(e) => setCatatanBerhasil(e.target.value)} />
              </Field>
            </FormGrid>
            {error && <div className="mt-3 font-mono text-[0.75rem] text-danger">{error}</div>}
            <FormActions>
              <Button
                disabled={saving}
                onClick={() =>
                  post(`/api/office-expenses/${data._id}/selesai`, {
                    buktiUrl: buktiBerhasilUrl,
                    catatan: catatanBerhasil,
                  })
                }
              >
                {saving ? "Menyimpan..." : "Tandai Selesai"}
              </Button>
            </FormActions>
          </div>
        </Panel>
      )}

      {/* Stage: selesai -> read-only summary */}
      {data.status === "selesai" && (
        <Panel className="mt-5 p-7">
          <div className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">Status</div>
          <div className="mt-1 font-sans text-[1.1rem] font-bold text-moss-deep">Selesai</div>

          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4">
            <Field label="Bukti Transfer">
              <div className="font-sans text-[0.85rem]">{rupiah(data.buktiTransferNominal ?? 0)}</div>
              {data.buktiTransferUrl && (
                <a href={data.buktiTransferUrl} target="_blank" rel="noreferrer" className="text-[0.78rem] text-accent-700 underline underline-offset-2">
                  Lihat bukti
                </a>
              )}
            </Field>
            <Field label="Bukti Pembelian Berhasil">
              {data.buktiBerhasilUrl ? (
                <a href={data.buktiBerhasilUrl} target="_blank" rel="noreferrer" className="text-[0.78rem] text-accent-700 underline underline-offset-2">
                  Lihat bukti
                </a>
              ) : (
                <div className="font-mono text-[0.78rem] text-muted">—</div>
              )}
            </Field>
          </div>
          {data.buktiBerhasilCatatan && (
            <div className="mt-3 font-sans text-[0.82rem] text-muted">{data.buktiBerhasilCatatan}</div>
          )}
        </Panel>
      )}
    </div>
  );
}
