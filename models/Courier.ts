import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const CourierSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    cost: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export type CourierDoc = InferSchemaType<typeof CourierSchema>;

export const Courier: Model<CourierDoc> =
  models.Courier || model<CourierDoc>("Courier", CourierSchema);
