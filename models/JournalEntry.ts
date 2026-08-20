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

export type JournalEntryDoc = InferSchemaType<typeof JournalEntrySchema>;

export const JournalEntry: Model<JournalEntryDoc> =
  models.JournalEntry || model<JournalEntryDoc>("JournalEntry", JournalEntrySchema);
