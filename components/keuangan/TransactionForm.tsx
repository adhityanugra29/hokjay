"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input, Select } from "@/components/ui/Form";
import { Button, LinkButton } from "@/components/ui/Button";
import UploadBox from "@/components/ui/UploadBox";
import { CASHFLOW_CATEGORIES } from "@/lib/constants";
import { manualExpenseAccounts, manualIncomeAccounts } from "@/lib/coa";

type Tipe = "masuk" | "keluar";

const EXPENSE_ACCOUNTS = manualExpenseAccounts();
const INCOME_ACCOUNTS = manualIncomeAccounts();
const EXPENSE_CATEGORIES = CASHFLOW_CATEGORIES.filter(
  (c) => c !== "Pembayaran Invoice" && c !== "DP Invoice" && c !== "Pendapatan Lain-lain"
);
const INCOME_CATEGORIES = CASHFLOW_CATEGORIES.filter(
  (c) => c !== "Pembayaran Invoice" && c !== "DP Invoice" && c !== "Pembelian Stok"
);

export default function TransactionForm({ defaultTipe = "keluar" }: { defaultTipe?: Tipe }) {
  const router = useRouter();
  const [tipe, setTipe] = useState<Tipe>(defaultTipe);
  const accounts = tipe === "keluar" ? EXPENSE_ACCOUNTS : INCOME_ACCOUNTS;

  const [keterangan, setKeterangan] = useState("");
  const [kategori, setKategori] = useState<string>(tipe === "keluar" ? "Pembelian Stok" : "Modal Tambahan");
  const [akunKode, setAkunKode] = useState<string>(accounts[0]?.code ?? "");
  const [referensi, setReferensi] = useState("");
  const [nominal, setNominal] = useState("");
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [buktiUrl, setBuktiUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchTipe(next: Tipe) {
    setTipe(next);
    const nextAccounts = next === "keluar" ? EXPENSE_ACCOUNTS : INCOME_ACCOUNTS;
    setAkunKode(nextAccounts[0]?.code ?? "");
    setKategori(next === "keluar" ? "Pembelian Stok" : "Modal Tambahan");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/cashflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipe,
          keterangan,
          kategori,
          akunKode,
          referensi: referensi || undefined,
          nominal: Number(nominal),
          tanggal,
          buktiUrl: buktiUrl || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal mencatat transaksi");
      }
      router.push("/keuangan");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mencatat transaksi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel className="max-w-xl p-7">
      <div className="mb-6 flex overflow-hidden border-2 border-line">
        <button
          type="button"
          onClick={() => switchTipe("masuk")}
          className={`flex-1 py-2.5 text-[0.85rem] font-semibold ${
            tipe === "masuk" ? "bg-accent text-ink" : "bg-panel text-muted hover:text-ink"
          }`}
        >
          Pemasukan
        </button>
        <button
          type="button"
          onClick={() => switchTipe("keluar")}
          className={`flex-1 border-l-2 border-line py-2.5 text-[0.85rem] font-semibold ${
            tipe === "keluar" ? "bg-accent text-ink" : "bg-panel text-muted hover:text-ink"
          }`}
        >
          Pengeluaran
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <FormGrid className="sm:grid-cols-1">
          <Field label="Keterangan">
            <Input
              required
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder={
                tipe === "keluar" ? "Contoh: Pembelian stok — Kompor Gas Industrial" : "Contoh: Tambahan modal dari pemilik"
              }
            />
          </Field>
          <Field label="Kategori">
            <Select value={kategori} onChange={(e) => setKategori(e.target.value)}>
              {(tipe === "keluar" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Akun (COA)" hint="Akun buku besar yang kena — sisi lawannya selalu Kas.">
            <Select value={akunKode} onChange={(e) => setAkunKode(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} — {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tanggal">
            <Input required type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </Field>
          <Field label="Referensi (opsional)">
            <Input value={referensi} onChange={(e) => setReferensi(e.target.value)} placeholder="Contoh: PO-0042" />
          </Field>
          <Field label="Nominal">
            <Input required type="number" value={nominal} onChange={(e) => setNominal(e.target.value)} placeholder="Rp 0" />
          </Field>
          <Field label="Bukti / Kwitansi (opsional)">
            <UploadBox folder="kwitansi" value={buktiUrl} onChange={setBuktiUrl} hint="JPG/PNG/PDF, maks 5MB" />
          </Field>
        </FormGrid>

        {error && <div className="mt-3 text-[0.75rem] text-accent-700">{error}</div>}

        <FormActions>
          <Button type="submit" disabled={saving}>
            {saving ? "Menyimpan..." : `Simpan ${tipe === "keluar" ? "Pengeluaran" : "Pemasukan"}`}
          </Button>
          <LinkButton variant="ghost" href="/keuangan">
            Batal
          </LinkButton>
        </FormActions>
      </form>
    </Panel>
  );
}
