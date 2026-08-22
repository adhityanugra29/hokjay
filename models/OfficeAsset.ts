import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const OFFICE_ASSET_KATEGORI = ["peralatan", "habis_pakai"] as const;
export const OFFICE_ASSET_KONDISI = ["baik", "perlu_servis", "rusak"] as const;

/**
 * "Inventaris Kantor" — internal office items, separate from
 * models/Product.ts (the sales catalog/warehouse stock sold to
 * customers). `kategori` is the required distinction the user asked for:
 * "peralatan" = a durable asset that belongs in this register long-term
 * (furniture, tools, electronics); "habis_pakai" = a consumable that gets
 * used up (ATK, cleaning supplies) — still logged here for spend
 * visibility, but never counted as standing asset value. Optionally traces
 * back to the PurchaseBill it came from (sumberBill) — see
 * models/PurchaseBill.ts's `dicatatSebagaiAset` flag, flipped once an
 * asset entry references it, mirroring PurchaseRequest -> PurchaseBill's
 * own status-flip convention. Confirmed with the user 2026-08-22.
 */
const OfficeAssetSchema = new Schema(
  {
    nama: { type: String, required: true, trim: true },
    kategori: { type: String, enum: OFFICE_ASSET_KATEGORI, required: true },
    qty: { type: Number, required: true, default: 1, min: 1 },
    satuan: { type: String, trim: true, default: "unit" },
    lokasi: { type: String, trim: true },
    kondisi: { type: String, enum: OFFICE_ASSET_KONDISI, default: "baik" },
    hargaPerolehan: { type: Number, min: 0 }, // total, not per-unit
    tanggalPerolehan: { type: Date, default: Date.now },
    sumberBill: { type: Schema.Types.ObjectId, ref: "PurchaseBill" },
    sumberBillNomor: { type: String },
    catatan: { type: String, trim: true },
  },
  { timestamps: true }
);

export type OfficeAssetDoc = InferSchemaType<typeof OfficeAssetSchema>;

export const OfficeAsset: Model<OfficeAssetDoc> =
  models.OfficeAsset || model<OfficeAssetDoc>("OfficeAsset", OfficeAssetSchema);
