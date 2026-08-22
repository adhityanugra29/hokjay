import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Supplier master data for Purchasing — separate from Customer (a supplier
 * sells TO the business, a customer buys FROM it). Bank/rekening are
 * required so Finance knows exactly where to transfer when paying a
 * PurchaseBill (see models/PurchaseBill.ts, which snapshots these fields at
 * bill-creation time so a later edit here doesn't retroactively change a
 * historical bill's payment info — same convention as Invoice's
 * customer/sales snapshots). Confirmed with the user 2026-08-22.
 */
const SupplierSchema = new Schema(
  {
    namaUsaha: { type: String, required: true, trim: true },
    alamat: { type: String, required: true, trim: true },
    bank: { type: String, required: true, trim: true },
    nomorRekening: { type: String, required: true, trim: true },
    kontak: { type: String, trim: true },
    catatan: { type: String, trim: true },
  },
  { timestamps: true }
);

export type SupplierDoc = InferSchemaType<typeof SupplierSchema>;

export const Supplier: Model<SupplierDoc> =
  models.Supplier || model<SupplierDoc>("Supplier", SupplierSchema);
