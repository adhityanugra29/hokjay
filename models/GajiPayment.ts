import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const GAJI_PAYMENT_TIPE = ["gaji-sales", "gaji-karyawan"] as const;

/**
 * One record per (tipe, penerima, periode) payment — the payment itself
 * (not an accrued liability, unlike komisi's Utang Komisi Sales/2200
 * account). Its existence for a given period is what marks that period as
 * "sudah dibayar" (see lib/payroll.ts) — a unique index per recipient type
 * backstops the same double-post-prevention pattern used elsewhere in this
 * app (see the atomic status guards on /api/insentif/bayar,
 * /api/purchase-bills/[id]/pay, etc.), just expressed as insert-uniqueness
 * instead of a status transition since there's no prior document to guard.
 *
 * `nominalKomponen`/`gajiHarianSnapshot`/`hariHadir` are only set for the
 * matching `tipe`; kept together in one collection since both are simple
 * "Payroll paid this recipient this period" records shown side by side.
 */
const GajiPaymentSchema = new Schema(
  {
    tipe: { type: String, enum: GAJI_PAYMENT_TIPE, required: true },
    sales: { type: Schema.Types.ObjectId, ref: "Sales" },
    karyawan: { type: Schema.Types.ObjectId, ref: "Karyawan" },
    penerimaNama: { type: String, required: true }, // snapshot
    periode: { type: String, required: true }, // "YYYY-MM"

    // tipe: "gaji-sales"
    gajiPokok: { type: Number },

    // tipe: "gaji-karyawan"
    hariHadir: { type: Number },
    gajiHarianSnapshot: { type: Number },

    totalGaji: { type: Number, required: true },
    tanggalBayar: { type: Date, required: true },
    buktiTransferUrl: { type: String },
    catatan: { type: String, trim: true },
    dibayarOleh: { type: String },
  },
  { timestamps: true }
);

GajiPaymentSchema.index({ tipe: 1, sales: 1, periode: 1 }, { unique: true, sparse: true });
GajiPaymentSchema.index({ tipe: 1, karyawan: 1, periode: 1 }, { unique: true, sparse: true });

export type GajiPaymentDoc = InferSchemaType<typeof GajiPaymentSchema>;

export const GajiPayment: Model<GajiPaymentDoc> =
  models.GajiPayment || model<GajiPaymentDoc>("GajiPayment", GajiPaymentSchema);
