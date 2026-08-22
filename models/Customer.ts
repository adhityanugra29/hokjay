import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const CustomerSchema = new Schema(
  {
    kode: { type: String, required: true, unique: true },
    nama: { type: String, required: true, trim: true },
    namaToko: { type: String, required: true, trim: true },
    jenisUsaha: { type: String, required: true, trim: true },
    whatsapp: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    alamat: { type: String, required: true },
    // Optional, added 2026-08-22 for the Pelanggan "daftar prioritas"
    // redesign — kota powers the "Kota terbesar" breakdown, termHari is the
    // payment-term credit window (0 = tunai/cash, due immediately) used to
    // compute "kebiasaan bayar" (tepat waktu / tempo N hari / lewat N hari).
    kota: { type: String, trim: true },
    termHari: { type: Number, default: 0, min: 0 },
    catatan: { type: String },
  },
  { timestamps: true }
);

export type CustomerDoc = InferSchemaType<typeof CustomerSchema>;

export const Customer: Model<CustomerDoc> =
  models.Customer || model<CustomerDoc>("Customer", CustomerSchema);
