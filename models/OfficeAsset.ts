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
    kodeAset: { type: String, unique: true, sparse: true }, // AST-#### — see lib/counters.ts's nextAssetCode()
    nama: { type: String, required: true, trim: true },
    kategori: { type: String, enum: OFFICE_ASSET_KATEGORI, required: true },
    qty: { type: Number, required: true, default: 1, min: 1 },
    satuan: { type: String, trim: true, default: "unit" },
    // Who's actually holding/using it right now, distinct from `lokasi`
    // (which room/site it's at) — design "6c", confirmed with the user
    // 2026-08-24: "siapa pegang dan berapa nilainya sekarang".
    pemegang: { type: String, trim: true },
    lokasi: { type: String, trim: true },
    kondisi: { type: String, enum: OFFICE_ASSET_KONDISI, default: "baik" },
    hargaPerolehan: { type: Number, min: 0 }, // total, not per-unit
    tanggalPerolehan: { type: Date, default: Date.now },
    // Straight-line depreciation over this many months — only meaningful
    // for kategori "peralatan" (habis_pakai never carries book value).
    // Nilai buku itself is computed on read (lib/inventaris.ts), not
    // stored, so changing this retroactively re-derives every asset's
    // current book value instead of drifting out of sync.
    umurEkonomisBulan: { type: Number, default: 48, min: 1 },
    // Write-off — asset stays in the list for history, but drops out of
    // "Perlu tindakan" and its book value is pinned to 0 from here on.
    dihapusBuku: { type: Boolean, default: false },
    dihapusBukuTanggal: { type: Date },
    dihapusBukuCatatan: { type: String, trim: true },
    sumberBill: { type: Schema.Types.ObjectId, ref: "PurchaseBill" },
    sumberBillNomor: { type: String },
    catatan: { type: String, trim: true },
  },
  { timestamps: true }
);

export type OfficeAssetDoc = InferSchemaType<typeof OfficeAssetSchema>;

export const OfficeAsset: Model<OfficeAssetDoc> =
  models.OfficeAsset || model<OfficeAssetDoc>("OfficeAsset", OfficeAssetSchema);
