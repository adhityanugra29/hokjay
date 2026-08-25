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
    // kota powers the "Kota terbesar" breakdown and the Kode Customer plate
    // prefix (lib/platNomor.ts); termHari is the payment-term credit window
    // (0 = tunai/cash, due immediately) used to compute "kebiasaan bayar"
    // (tepat waktu / tempo N hari / lewat N hari). kota/provinsi (dropdown+
    // search pair on the form, see lib/wilayah.ts) were optional when added
    // 2026-08-22/25, made required the same day per the user's follow-up —
    // existing customers from before that stay whatever they already had
    // (Mongoose only enforces `required` on save, not on documents already
    // in the database).
    kota: { type: String, required: true, trim: true },
    provinsi: { type: String, required: true, trim: true },
    termHari: { type: Number, default: 0, min: 0 },
    catatan: { type: String },
  },
  { timestamps: true }
);

export type CustomerDoc = InferSchemaType<typeof CustomerSchema>;

export const Customer: Model<CustomerDoc> =
  models.Customer || model<CustomerDoc>("Customer", CustomerSchema);
