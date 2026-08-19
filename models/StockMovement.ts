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

export type StockMovementDoc = InferSchemaType<typeof StockMovementSchema>;

export const StockMovement: Model<StockMovementDoc> =
  models.StockMovement || model<StockMovementDoc>("StockMovement", StockMovementSchema);
