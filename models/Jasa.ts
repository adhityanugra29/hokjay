import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Master data for service fees (biaya jasa) — deliberately its own
// collection, NOT a Product: a service has no stock, harga beli/HPP, harga
// minimum, kondisi, dimensi, or commission, and every Product-reading path
// (Katalog, low-stock alerts, Purchasing, dashboard, commission) would
// otherwise need a "kecuali jasa" exception. There is also deliberately no
// price here — the nominal is typed per invoice line — and no satuan,
// qty, or keterangan: a jasa is just a name, a code, and an active flag.
// Per the user's request 2026-10-07.
const JasaSchema = new Schema(
  {
    nama: { type: String, required: true, trim: true },
    kode: { type: String, required: true, unique: true, trim: true, uppercase: true },
    // Inactive jasa can't be added to a new invoice but stay on old ones.
    aktif: { type: Boolean, default: true },
  },
  { timestamps: true }
);

JasaSchema.index({ aktif: 1, nama: 1 });

export type JasaDoc = InferSchemaType<typeof JasaSchema>;

export const Jasa: Model<JasaDoc> = models.Jasa || model<JasaDoc>("Jasa", JasaSchema);
