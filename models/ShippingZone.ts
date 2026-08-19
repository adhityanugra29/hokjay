import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Simple, admin-defined distance tiers for shipping cost (e.g. "Dalam Kota",
 * "Luar Kota", "Luar Pulau") — no geocoding/3rd-party API, the admin just
 * sets a flat cost per zone and sales pick the applicable one per invoice.
 * See rancangan-integrasi-ongkir-awb.md for the eventual real-API path
 * (Biteship etc.) this is a simpler stand-in for, confirmed with the user
 * 2026-08-19.
 */
const ShippingZoneSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    cost: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export type ShippingZoneDoc = InferSchemaType<typeof ShippingZoneSchema>;

export const ShippingZone: Model<ShippingZoneDoc> =
  models.ShippingZone || model<ShippingZoneDoc>("ShippingZone", ShippingZoneSchema);
