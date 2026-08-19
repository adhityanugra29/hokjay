import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const SalesSchema = new Schema(
  {
    nama: { type: String, required: true, trim: true },
    aktif: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type SalesDoc = InferSchemaType<typeof SalesSchema>;

export const Sales: Model<SalesDoc> = models.Sales || model<SalesDoc>("Sales", SalesSchema);
