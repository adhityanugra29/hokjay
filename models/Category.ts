import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    // Owner-only default barang-bekas commission rate for every product in
    // this category that doesn't have its own Product.komisiBekasPercent
    // override. undefined = no category default, falls all the way back
    // to the global 10% in lib/commission.ts. See
    // resolveKomisiBekasPercent(). Per the user's request 2026-09-03.
    komisiBekasPercent: { type: Number, min: 0, max: 100 },
  },
  { timestamps: true }
);

export type CategoryDoc = InferSchemaType<typeof CategorySchema>;

export const Category: Model<CategoryDoc> =
  models.Category || model<CategoryDoc>("Category", CategorySchema);
