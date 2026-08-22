import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const SalesSchema = new Schema(
  {
    nama: { type: String, required: true, trim: true },
    aktif: { type: Boolean, default: true },
    // Bank details for commission payout — see app/bayar-komisi. Optional
    // (many existing Sales records predate this) so a missing/unverified
    // rekening just shows as a warning on the payout sheet, not a hard block.
    bank: { type: String, trim: true },
    nomorRekening: { type: String, trim: true },
    rekeningTerverifikasi: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type SalesDoc = InferSchemaType<typeof SalesSchema>;

export const Sales: Model<SalesDoc> = models.Sales || model<SalesDoc>("Sales", SalesSchema);
