import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const PURCHASE_ORDER_STATUSES = ["menunggu", "diterima", "dibatalkan"] as const;

const PurchaseOrderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    namaSnapshot: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    hargaSatuan: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

/**
 * "Purchasing" restocking pipeline — design "6a" from the mockup doc the
 * user supplied 2026-08-24: stok minimum -> PO -> barang diterima -> tagihan
 * -> kas keluar. Separate from PurchaseBill/"Material Order", which this
 * model feeds into (see below) — a PurchaseOrder is the *order*, a
 * PurchaseBill is the *bill Finance actually pays*, and PurchaseBill stays
 * single-line-item, so receiving a multi-item PO creates one PurchaseBill
 * per item rather than reshaping PurchaseBill into a multi-item document
 * (avoids touching Bayar Tagihan/payment/"Catat sebagai Aset", all of which
 * assume one item per bill).
 */
const PurchaseOrderSchema = new Schema(
  {
    nomor: { type: String, required: true, unique: true }, // PO-YYYYMM####

    supplierRef: { type: Schema.Types.ObjectId, ref: "Supplier" },
    // Snapshotted at PO-creation time — same convention as PurchaseBill's
    // supplier fields, so a later edit to the Supplier record doesn't
    // retroactively change a historical PO.
    supplier: { type: String, required: true, trim: true },
    supplierAlamat: { type: String },
    supplierBank: { type: String },
    supplierNomorRekening: { type: String },

    items: { type: [PurchaseOrderItemSchema], required: true },
    totalNilai: { type: Number, required: true, min: 0 },

    status: { type: String, enum: PURCHASE_ORDER_STATUSES, required: true, default: "menunggu" },
    tanggalPesan: { type: Date, default: Date.now },
    tanggalEstimasi: { type: Date }, // ETA — used to flag "telat" (late) while status is still "menunggu"
    tanggalDiterima: { type: Date },
    catatan: { type: String, trim: true },
    dibuatOleh: { type: String },

    // The PurchaseBill ids auto-created when this PO was marked diterima —
    // one per item (see app/api/purchase-orders/[id]/terima).
    bills: [{ type: Schema.Types.ObjectId, ref: "PurchaseBill" }],
  },
  { timestamps: true }
);

PurchaseOrderSchema.pre("validate", function () {
  for (const item of this.items) {
    item.subtotal = Math.round(item.qty * item.hargaSatuan);
  }
  this.totalNilai = this.items.reduce((s, i) => s + i.subtotal, 0);
});

export type PurchaseOrderDoc = InferSchemaType<typeof PurchaseOrderSchema>;

export const PurchaseOrder: Model<PurchaseOrderDoc> =
  models.PurchaseOrder || model<PurchaseOrderDoc>("PurchaseOrder", PurchaseOrderSchema);
