import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const PURCHASE_REQUEST_STATUSES = ["diajukan", "diproses", "dibeli", "dibatalkan"] as const;

/**
 * "Request Produk PO" — an item not yet in the catalog/warehouse that a
 * customer needs. Raised either by Sales from the Katalog (sumber: "sales",
 * tied to a customer) or directly by the Purchasing team for a general
 * restock need (sumber: "purchasing", no customer). Purchasing reviews
 * these and, once they've sourced a supplier and price, creates a
 * PurchaseBill from it — see models/PurchaseBill.ts. This model is
 * deliberately just a communication/tracking ticket: it does not touch
 * Product/stok itself (the item still has to be added to the catalog by
 * hand, same as any other new product, once it physically arrives).
 */
const PurchaseRequestSchema = new Schema(
  {
    nomor: { type: String, required: true, unique: true },
    namaBarang: { type: String, required: true, trim: true },
    deskripsi: { type: String, trim: true },
    qty: { type: Number, required: true, default: 1, min: 1 },

    sumber: { type: String, enum: ["sales", "purchasing"], required: true },
    customer: {
      ref: { type: Schema.Types.ObjectId, ref: "Customer" },
      nama: { type: String },
    },
    sales: {
      ref: { type: Schema.Types.ObjectId, ref: "Sales" },
      nama: { type: String },
    },
    diajukanOleh: { type: String }, // logged-in user's nama, from session

    status: { type: String, enum: PURCHASE_REQUEST_STATUSES, required: true, default: "diajukan" },
    catatan: { type: String, trim: true },
    bill: { type: Schema.Types.ObjectId, ref: "PurchaseBill" },
  },
  { timestamps: true }
);

export type PurchaseRequestDoc = InferSchemaType<typeof PurchaseRequestSchema>;

export const PurchaseRequest: Model<PurchaseRequestDoc> =
  models.PurchaseRequest || model<PurchaseRequestDoc>("PurchaseRequest", PurchaseRequestSchema);
