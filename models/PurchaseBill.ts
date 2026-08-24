import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * "Tagihan Pembelian" — created by the Purchasing team once they've sourced
 * a supplier and know the actual cost, optionally against a PurchaseRequest
 * (see models/PurchaseRequest.ts) or standalone (e.g. a routine restock
 * Purchasing initiated itself). This is what Finance pays — see
 * app/bayar-tagihan. Paying it posts a normal "Pembelian Stok" cashflow +
 * journal entry (lib/services/recordCashflow.ts), same ledger account
 * (1300 — Persediaan Barang Dagang) the existing manual stock-purchase
 * expense form already uses, so this doesn't need a new COA account.
 */
const PurchaseBillSchema = new Schema(
  {
    nomor: { type: String, required: true, unique: true },
    request: { type: Schema.Types.ObjectId, ref: "PurchaseRequest" },
    // Set when this bill was auto-created from a received PurchaseOrder
    // item (see app/api/purchase-orders/[id]/terima) — absent for
    // standalone/manual bills, same optional-link convention as `request`.
    purchaseOrder: { type: Schema.Types.ObjectId, ref: "PurchaseOrder" },

    namaBarang: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, default: 1, min: 1 },
    hargaSatuan: { type: Number, required: true, min: 0 },
    totalTagihan: { type: Number, required: true, min: 0 },

    // Supplier — snapshotted from models/Supplier.ts at bill-creation time
    // (same convention as Invoice's customer/sales snapshots) so a later
    // edit to the supplier's bank/rekening doesn't retroactively change a
    // historical bill's payment info. `supplier` free-text stays for
    // standalone bills with no matching Supplier record.
    supplierRef: { type: Schema.Types.ObjectId, ref: "Supplier" },
    supplier: { type: String, required: true, trim: true }, // nama usaha snapshot
    supplierAlamat: { type: String },
    supplierBank: { type: String },
    supplierNomorRekening: { type: String },

    jatuhTempo: { type: Date },
    catatan: { type: String, trim: true },
    buktiTagihanUrl: { type: String }, // nota/invoice from the supplier
    dibuatOleh: { type: String }, // logged-in Purchasing user's nama

    status: { type: String, enum: ["belum_dibayar", "dibayar"], required: true, default: "belum_dibayar" },
    dibayarTanggal: { type: Date },
    dibayarBuktiUrl: { type: String }, // Finance's proof-of-transfer
    dibayarCatatan: { type: String, trim: true },
    dibayarOleh: { type: String }, // logged-in Finance user's nama

    // Flipped once an OfficeAsset entry is created referencing this bill
    // (see models/OfficeAsset.ts) — lets /purchasing/tagihan hide the
    // "Catat sebagai Aset" action once it's already been done, same
    // status-flip convention as PurchaseRequest -> PurchaseBill.
    dicatatSebagaiAset: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Runs before validators (unlike pre("save")) so the required/min checks on
// totalTagihan below already see the computed value — matches the
// zero-arg synchronous hook pattern in models/Product.ts.
PurchaseBillSchema.pre("validate", function () {
  this.totalTagihan = Math.round(this.qty * this.hargaSatuan);
});

export type PurchaseBillDoc = InferSchemaType<typeof PurchaseBillSchema>;

export const PurchaseBill: Model<PurchaseBillDoc> =
  models.PurchaseBill || model<PurchaseBillDoc>("PurchaseBill", PurchaseBillSchema);
