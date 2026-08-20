import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const USER_ROLES = ["sales", "finance", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/**
 * Real login accounts — separate from the Sales collection (which stays a
 * lightweight roster for commission tracking/ranking, no login capability).
 * Password is always bcrypt-hashed, never returned to the client (see
 * app/api/admin/users/route.ts, which strips it before responding).
 */
const UserSchema = new Schema(
  {
    nama: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, required: true, default: "sales" },
    aktif: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema>;

export const User: Model<UserDoc> = models.User || model<UserDoc>("User", UserSchema);
