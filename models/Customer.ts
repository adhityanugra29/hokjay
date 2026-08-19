import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const CustomerSchema = new Schema(
  {
    kode: { type: String, required: true, unique: true },
    nama: { type: String, required: true, trim: true },
    whatsapp: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    alamat: { type: String, required: true },
    catatan: { type: String },
  },
  { timestamps: true }
);

export type CustomerDoc = InferSchemaType<typeof CustomerSchema>;

export const Customer: Model<CustomerDoc> =
  models.Customer || model<CustomerDoc>("Customer", CustomerSchema);
