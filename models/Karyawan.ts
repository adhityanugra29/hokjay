import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Non-sales staff (kurir internal, admin gudang, dll) — separate from both
 * User (login accounts) and Sales (commission roster). Confirmed with the
 * user 2026-08-23: these employees have no login of their own; Admin
 * manages this roster and records their daily attendance (see
 * models/Absensi.ts), which drives their Payroll gaji (see
 * models/GajiPayment.ts, lib/payroll.ts).
 */
const KaryawanSchema = new Schema(
  {
    nama: { type: String, required: true, trim: true },
    jabatan: { type: String, trim: true },
    gajiHarian: { type: Number, required: true, min: 0 },
    aktif: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type KaryawanDoc = InferSchemaType<typeof KaryawanSchema>;

export const Karyawan: Model<KaryawanDoc> = models.Karyawan || model<KaryawanDoc>("Karyawan", KaryawanSchema);
