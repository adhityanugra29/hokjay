import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const PaymentMethodSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

export type PaymentMethodDoc = InferSchemaType<typeof PaymentMethodSchema>;

export const PaymentMethod: Model<PaymentMethodDoc> =
  models.PaymentMethod || model<PaymentMethodDoc>("PaymentMethod", PaymentMethodSchema);
