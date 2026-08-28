import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { STOCK_REASONS } from "@/lib/constants";

const StockMovementSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productNameSnapshot: { type: String, required: true },
    tanggal: { type: Date, default: Date.now },
    tipe: { type: String, enum: ["masuk", "keluar"], required: true },
    qty: { type: Number, required: true },
    alasan: { type: String, enum: STOCK_REASONS, required: true },

    invoice: { type: Schema.Types.ObjectId, ref: "Invoice" },
    invoiceNomorSnapshot: { type: String },
    salesSnapshot: { type: String },
    tanggalKirim: { type: Date },
    kurir: { type: String },
    catatan: { type: String },
  },
  { timestamps: true }
);

// Additive performance indexes (no behavior change) — per the user's
// request 2026-08-28. product+tanggal covers per-product Riwayat Stok
// listings; alasan covers the "Penjualan" distinct() lookups
// (getProdukBaruIds in lib/katalog.ts).
StockMovementSchema.index({ product: 1, tanggal: -1 });
StockMovementSchema.index({ alasan: 1 });

export type StockMovementDoc = InferSchemaType<typeof StockMovementSchema>;

export const StockMovement: Model<StockMovementDoc> =
  models.StockMovement || model<StockMovementDoc>("StockMovement", StockMovementSchema);
