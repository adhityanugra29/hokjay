import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Singleton settings document (always exactly one row, upserted by _id).
 * Currently just the opening cash balance — see app/admin/keuangan and
 * lib/services/journal.ts's postKasAwal(), which posts/reconciles the
 * matching journal entry whenever this changes.
 */
const PengaturanSchema = new Schema(
  {
    _id: { type: String, default: "singleton" },
    kasAwal: { type: Number, default: 0 },
    kasAwalTanggal: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export type PengaturanDoc = InferSchemaType<typeof PengaturanSchema>;

export const Pengaturan: Model<PengaturanDoc> =
  models.Pengaturan || model<PengaturanDoc>("Pengaturan", PengaturanSchema);
