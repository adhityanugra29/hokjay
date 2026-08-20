import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { CASHFLOW_CATEGORIES } from "@/lib/constants";

const CashflowEntrySchema = new Schema(
  {
    tanggal: { type: Date, default: Date.now },
    tipe: { type: String, enum: ["masuk", "keluar"], required: true },
    keterangan: { type: String, required: true },
    kategori: { type: String, enum: CASHFLOW_CATEGORIES, required: true },
    referensi: { type: String },
    nominal: { type: Number, required: true },

    // Which ledger account this manual entry hits (see lib/coa.ts) — the
    // other side of the double-entry is always Kas (1101). Invoice-driven
    // entries (Pembayaran Invoice) don't set this; the accounting journal
    // for those is posted separately, keyed off the invoice itself.
    akunKode: { type: String },
    // Scanned/uploaded kwitansi (receipt) for manual entries — see
    // components/keuangan/TransactionForm.tsx.
    buktiUrl: { type: String },

    invoice: { type: Schema.Types.ObjectId, ref: "Invoice" },
    product: { type: Schema.Types.ObjectId, ref: "Product" },
  },
  { timestamps: true }
);

export type CashflowEntryDoc = InferSchemaType<typeof CashflowEntrySchema>;

export const CashflowEntry: Model<CashflowEntryDoc> =
  models.CashflowEntry || model<CashflowEntryDoc>("CashflowEntry", CashflowEntrySchema);
