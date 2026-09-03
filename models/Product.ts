import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    merk: { type: String, trim: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    // Free-form string, validated against models/Category.ts entries at the
    // API layer rather than a hardcoded Mongoose enum — categories are
    // managed by the user via /admin.
    category: { type: String, required: true, trim: true },
    kondisi: { type: String, enum: ["baru", "bekas"], default: "baru" },
    kondisiPercent: { type: Number },

    // Drives whether "Ketebalan Material" applies on the product form —
    // material thickness only makes sense for fabricated sheet-metal items
    // (tables, racks), not manufactured appliances (see confirmation with
    // the user 2026-08-20).
    tipeProduk: { type: String, enum: ["elektronik", "non-elektronik"], default: "non-elektronik" },

    hargaBeli: { type: Number, required: true },
    hargaRekomendasi: { type: Number, required: true },
    hargaMinimum: { type: Number, required: true },

    komisiPercent: { type: Number, required: true, default: 5 },
    komisiNominal: { type: Number, required: true, default: 0 },
    // Owner-only override of the barang-bekas commission rate (normally a
    // flat 10% of Harga Bottom/Minimum, see lib/commission.ts) for THIS
    // product specifically. undefined = no override, falls back to the
    // product's Category.komisiBekasPercent, then the global 10% default
    // — see resolveKomisiBekasPercent() in lib/commission.ts. Deliberately
    // separate from komisiPercent above (that one drives the unrelated
    // Hot Products reference figure, komisiPercent% x hargaRekomendasi —
    // reusing it here would have silently dropped every existing bekas
    // product's real commission from 10% to komisiPercent's 5% default).
    // Per the user's request 2026-09-03.
    komisiBekasPercent: { type: Number, min: 0, max: 100 },

    stok: { type: Number, required: true, default: 0 },
    // When this stock/product entry actually arrived — distinct from
    // createdAt (when the record was typed into the system, which can lag
    // the real arrival by days).
    tanggalBarangMasuk: { type: Date },
    // Per-product override of LOW_STOCK_THRESHOLD — powers Purchasing's
    // auto-suggested PO list (see lib/purchasing.ts). Defaults to the same
    // global threshold so existing products behave the same until someone
    // tunes it per product.
    stokMinimum: { type: Number, default: LOW_STOCK_THRESHOLD, min: 0 },
    alertHariTidakTerjual: { type: Number, default: 45 },

    dimensi: {
      panjangCm: Number,
      lebarCm: Number,
      tinggiCm: Number,
    },
    ketebalan: { type: String },
    // Only meaningful when tipeProduk is "elektronik" — mirrors ketebalan's
    // "only for non-elektronik" gating (see ProductForm.tsx). Free-form
    // string (e.g. "1200 Watt") rather than a bare number, same convention
    // as ketebalan. Per the user's request 2026-08-27.
    dayaListrik: { type: String },

    // fotoUrl is the "Tampak Depan" (front view) shot — the only one shown
    // in Katalog/kartu produk/PDF katalog. Samping/Belakang are reference-
    // only extra angles, visible only on the product edit form (see
    // confirmation with the user 2026-08-20).
    fotoUrl: { type: String },
    fotoSampingUrl: { type: String },
    fotoBelakangUrl: { type: String },
    deskripsi: { type: String },

    // True for one-off items generated from "Pesan Produk Custom" — they
    // behave like any other product (show up in Katalog/Inventory, can be
    // added/removed with the normal qty stepper) but are flagged so the UI
    // can badge them and so admins understand why a bespoke name showed up.
    isCustom: { type: Boolean, default: false },
    // Reference-only attachment (PDF/image) — the customer's RAB (budget
    // plan) or café floor plan a multi-item custom order was based on. Not
    // auto-parsed (see confirmation with the user 2026-08-21); just kept so
    // the team can pull up the original document later. Every item created
    // from the same submission shares this same URL.
    rabUrl: { type: String },

    // Owner-set top-down price lock — per the user's request 2026-08-29.
    // While active, Katalog can't offer any OTHER price for this product
    // (no Harga Rekomendasi/Minimum toggle, no custom price, no Diskon):
    // `harga` is the only price shown/sold at. Manually turned on/off by
    // an owner/super_admin (see app/api/products/[id]/flash-sale/route.ts)
    // — no automatic expiry.
    flashSale: {
      active: { type: Boolean, default: false },
      harga: { type: Number },
      setBy: { type: String },
      setAt: { type: Date },
    },
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

// Additive performance indexes (no behavior change) — per the user's
// request 2026-08-28 to speed up page loads. category alone covers
// Purchasing/API category filters; the compound one matches Katalog's own
// query shape (Product.find({isCustom, stok:{$gt:0}}).sort({name:1})) —
// equality + range + sort in one index, MongoDB's recommended ESR order.
ProductSchema.index({ category: 1 });
ProductSchema.index({ isCustom: 1, stok: 1, name: 1 });
// Matches getProdukBaruIds()'s query shape (lib/katalog.ts).
ProductSchema.index({ isCustom: 1, createdAt: -1 });

export type ProductDoc = InferSchemaType<typeof ProductSchema>;

export const Product: Model<ProductDoc> =
  models.Product || model<ProductDoc>("Product", ProductSchema);
