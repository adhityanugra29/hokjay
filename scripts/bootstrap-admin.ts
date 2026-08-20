/**
 * Creates the first Admin login account, if none exists yet — safe to run
 * repeatedly (no-op once at least one admin account exists). Non-
 * destructive, unlike scripts/seed.ts (which wipes and reseeds everything) —
 * this is meant to be run once against a real/production database to bootstrap
 * access after the authentication feature was added, without touching any
 * existing data.
 *
 * Usage: npm run bootstrap-admin
 * Reads MONGODB_URI from .env.local, and optionally ADMIN_EMAIL /
 * ADMIN_PASSWORD / ADMIN_NAMA — otherwise falls back to the defaults below.
 * CHANGE THE PASSWORD after your first login (Admin > Akun Login).
 */
import { config } from "dotenv";
import path from "node:path";
config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { dbConnect } from "../lib/db";
import { User } from "../models/User";

const DEFAULT_EMAIL = process.env.ADMIN_EMAIL || "admin@horecajaya.id";
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || "horeca-admin-2026";
const DEFAULT_NAMA = process.env.ADMIN_NAMA || "Admin";

async function main() {
  await dbConnect();

  const existingAdmin = await User.findOne({ role: "admin" });
  if (existingAdmin) {
    console.log(`An admin account already exists (${existingAdmin.email}) — nothing to do.`);
    return;
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const admin = await User.create({
    nama: DEFAULT_NAMA,
    email: DEFAULT_EMAIL.toLowerCase(),
    passwordHash,
    role: "admin",
    aktif: true,
  });

  console.log("Created first admin account:");
  console.log("  Email:   ", admin.email);
  console.log("  Password:", DEFAULT_PASSWORD);
  console.log("\nLog in at /login, then change this password and create real staff accounts via Admin > Akun Login.");
}

main()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
