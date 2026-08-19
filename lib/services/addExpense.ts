import { dbConnect } from "@/lib/db";
import { CashflowEntry } from "@/models/CashflowEntry";
import { postCashflowKeluar } from "@/lib/services/journal";
import type { CASHFLOW_CATEGORIES } from "@/lib/constants";

export interface AddExpenseInput {
  keterangan: string;
  kategori: (typeof CASHFLOW_CATEGORIES)[number];
  referensi?: string;
  nominal: number;
  tanggal?: Date | string;
  productId?: string;
}

export async function addExpense(input: AddExpenseInput) {
  await dbConnect();
  if (input.nominal <= 0) throw new Error("Nominal harus lebih dari 0");

  const tanggal = input.tanggal ? new Date(input.tanggal) : new Date();

  const entry = await CashflowEntry.create({
    tipe: "keluar",
    keterangan: input.keterangan,
    kategori: input.kategori,
    referensi: input.referensi,
    nominal: input.nominal,
    tanggal,
    product: input.productId || undefined,
  });

  await postCashflowKeluar({ keterangan: input.keterangan, kategori: input.kategori, nominal: input.nominal, tanggal });

  return entry;
}
