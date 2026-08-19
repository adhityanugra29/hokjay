import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    // Free-form string, validated against models/Category.ts entries at the
    // API layer rather than a hardcoded Mongoose enum — categories are
    // managed by the user via /admin.
    category: { type: String, required: true, trim: true },
    kondisi: { type: String, enum: ["baru", "bekas"], default: "baru" },
    kondisiPercent: { type: Number },

    hargaBeli: { type: Number, required: true },
    hargaRekomendasi: { type: Number, required: true },
    hargaMinimum: { type: Number, required: true },

    komisiPercent: { type: Number, required: true, default: 5 },
    komisiNominal: { type: Number, required: true, default: 0 },

    stok: { type: Number, required: true, default: 0 },
    alertHariTidakTerjual: { type: Number, default: 45 },

    dimensi: {
      panjangCm: Number,
      lebarCm: Number,
      tinggiCm: Number,
    },
    ketebalan: { type: String },

    fotoUrl: { type: String },
    deskripsi: { type: String },

    // True for one-off items generated from "Pesan Produk Custom" — they
    // behave like any other product (show up in Katalog/Inventory, can be
    // added/removed with the normal qty stepper) but are flagged so the UI
    // can badge them and so admins understand why a bespoke name showed up.
    isCustom: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Keep komisiNominal in sync with komisiPercent x hargaRekomendasi whenever
// either changes, mirroring the mockup's updateKomisiNominal() behaviour.
ProductSchema.pre("save", function () {
  if (this.isModified("komisiPercent") || this.isModified("hargaRekomendasi")) {
    this.komisiNominal = Math.round((this.komisiPercent / 100) * this.hargaRekomendasi);
  }
});

ProductSchema.virtual("stockStatus").get(function () {
  if (this.stok <= 0) return "out";
  if (this.stok <= LOW_STOCK_THRESHOLD) return "low";
  return "ok";
});

ProductSchema.set("toJSON", { virtuals: true });
ProductSchema.set("toObject", { virtuals: true });

export type ProductDoc = InferSchemaType<typeof ProductSchema>;

export const Product: Model<ProductDoc> =
  models.Product || model<ProductDoc>("Product", ProductSchema);
