import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Sparse daily attendance — one document per (karyawan, tanggal) only when
 * that karyawan was actually hadir that day (no "tidak hadir" rows are ever
 * stored; absence is just the lack of a record). Admin marks this manually
 * per the user's confirmation 2026-08-23. Gaji for the period = gajiHarian
 * (snapshotted at the time of payment, not looked up live from Karyawan) x
 * count of Absensi rows in that period — see lib/payroll.ts.
 */
const AbsensiSchema = new Schema(
  {
    karyawan: { type: Schema.Types.ObjectId, ref: "Karyawan", required: true },
    karyawanNama: { type: String, required: true }, // snapshot, survives a later Karyawan rename
    tanggal: { type: Date, required: true },
    dicatatOleh: { type: String },
  },
  { timestamps: true }
);

AbsensiSchema.index({ karyawan: 1, tanggal: 1 }, { unique: true });

export type AbsensiDoc = InferSchemaType<typeof AbsensiSchema>;

export const Absensi: Model<AbsensiDoc> = models.Absensi || model<AbsensiDoc>("Absensi", AbsensiSchema);
