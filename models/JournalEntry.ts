import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const JournalLineSchema = new Schema(
  {
    akunKode: { type: String, required: true },
    akunNama: { type: String, required: true },
    debit: { type: Number, required: true, default: 0 },
    credit: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const SOURCE_TYPES = [
  "invoice-finalisasi",
  "invoice-hpp",
  "invoice-komisi",
  "invoice-lunas",
  "invoice-dp",
  "komisi-cair",
  "cashflow-keluar",
  "cashflow-masuk",
  "kas-awal",
] as const;

const JournalEntrySchema = new Schema(
  {
    tanggal: { type: Date, default: Date.now },
    deskripsi: { type: String, required: true },
    sumberTipe: { type: String, enum: SOURCE_TYPES, required: true },
    sumberLabel: { type: String }, // e.g. invoice nomor, for display
    invoice: { type: Schema.Types.ObjectId, ref: "Invoice" },
    lines: { type: [JournalLineSchema], default: [] },
  },
  { timestamps: true }
);

// Every journal entry must balance — this is the whole point of
// double-entry bookkeeping, enforced here rather than trusted per-caller.
JournalEntrySchema.pre("save", function () {
  const totalDebit = this.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = this.lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.5) {
    throw new Error(
      `Jurnal tidak balance: debit ${totalDebit} ≠ kredit ${totalCredit} (${this.deskripsi})`
    );
  }
});

// Additive performance indexes (no behavior change) — per the user's
// request 2026-08-28. invoice+sumberTipe matches the "is this invoice a
// pre-2026-08-27 legacy-finalized one" check run on every payInvoice/
// updateInvoice/deleteInvoice/ubah-page-load (lib/services/payInvoice.ts
// etc); tanggal covers Akuntansi's date-range reports.
JournalEntrySchema.index({ invoice: 1, sumberTipe: 1 });
JournalEntrySchema.index({ tanggal: 1 });

export type JournalEntryDoc = InferSchemaType<typeof JournalEntrySchema>;

export const JournalEntry: Model<JournalEntryDoc> =
  models.JournalEntry || model<JournalEntryDoc>("JournalEntry", JournalEntrySchema);
