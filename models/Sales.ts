import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const SALES_STATUS_KEPEGAWAIAN = ["tetap", "freelance"] as const;

const SalesSchema = new Schema(
  {
    nama: { type: String, required: true, trim: true },
    aktif: { type: Boolean, default: true },
    // Bank details for commission payout — see app/payroll (formerly
    // app/bayar-komisi). Optional (many existing Sales records predate
    // this) so a missing/unverified rekening just shows as a warning on
    // the payout sheet, not a hard block.
    bank: { type: String, trim: true },
    nomorRekening: { type: String, trim: true },
    rekeningTerverifikasi: { type: Boolean, default: false },
    // Payroll (2026-08-23): "tetap" sales get a monthly gaji pokok on top
    // of commission; "freelance" sales only ever earn commission — gajiPokok
    // is ignored for them even if a stray value is set. See lib/payroll.ts.
    statusKepegawaian: { type: String, enum: SALES_STATUS_KEPEGAWAIAN, default: "freelance" },
    gajiPokok: { type: Number, default: 0, min: 0 },
    // Monthly sales target (rupiah) — powers the Leaderboard Sales board
    // (see lib/insentif.ts's getSalesBoard, components/insentif/SalesBoard.tsx).
    // 0 = no target set; that sales just doesn't show a progress bar.
    targetBulanan: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export type SalesDoc = InferSchemaType<typeof SalesSchema>;

export const Sales: Model<SalesDoc> = models.Sales || model<SalesDoc>("Sales", SalesSchema);
