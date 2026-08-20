import { dbConnect } from "@/lib/db";
import { CashflowEntry } from "@/models/CashflowEntry";
import { postCashflowKeluar, postCashflowMasuk } from "@/lib/services/journal";
import type { CASHFLOW_CATEGORIES } from "@/lib/constants";

export interface RecordCashflowInput {
  tipe: "masuk" | "keluar";
  keterangan: string;
  kategori: (typeof CASHFLOW_CATEGORIES)[number];
  /** Ledger account this hits — see lib/coa.ts's manualExpenseAccounts()/manualIncomeAccounts(). */
  akunKode: string;
  referensi?: string;
  nominal: number;
  tanggal?: Date | string;
  productId?: string;
  /** Uploaded kwitansi/receipt URL. */
  buktiUrl?: string;
}

/** Records a manual cash in/out entry and posts the matching double-entry journal line. */
export async function recordCashflow(input: RecordCashflowInput) {
  await dbConnect();
  if (input.nominal <= 0) throw new Error("Nominal harus lebih dari 0");
  if (!input.akunKode) throw new Error("Akun (COA) wajib dipilih");

  const tanggal = input.tanggal ? new Date(input.tanggal) : new Date();

  const entry = await CashflowEntry.create({
    tipe: input.tipe,
    keterangan: input.keterangan,
    kategori: input.kategori,
    referensi: input.referensi,
    nominal: input.nominal,
    tanggal,
    akunKode: input.akunKode,
    buktiUrl: input.buktiUrl,
    product: input.productId || undefined,
  });

  if (input.tipe === "keluar") {
    await postCashflowKeluar({
      keterangan: input.keterangan,
      akunKode: input.akunKode,
      nominal: input.nominal,
      tanggal,
    });
  } else {
    await postCashflowMasuk({
      keterangan: input.keterangan,
      akunKode: input.akunKode,
      nominal: input.nominal,
      tanggal,
    });
  }

  return entry;
}
