/**
 * One-time backfill for per-invoice Syarat & Ketentuan (2026-10-12): copies
 * the CURRENT Admin → Invoice template onto every invoice that has already
 * left draft (Belum bayar / DP / Lunas) and has no S&K text of its own yet,
 * so a later template change never rewrites an invoice already sent to a
 * customer. Drafts are left alone on purpose — they follow the template
 * until sent.
 *
 * Non-destructive and safe to re-run: only writes invoices where
 * syaratKetentuan is missing, and only that one field.
 *
 * Usage:
 *   npm run freeze-syarat-ketentuan            # dry run — prints counts only
 *   npm run freeze-syarat-ketentuan -- --apply # actually writes
 * Reads MONGODB_URI from .env.local.
 */
import { config } from "dotenv";
import path from "node:path";
config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import { dbConnect } from "../lib/db";
import { Invoice } from "../models/Invoice";
import { Pengaturan } from "../models/Pengaturan";
import { normalizeSyarat } from "../lib/syaratKetentuan";

async function main() {
  const apply = process.argv.includes("--apply");
  await dbConnect();

  const pengaturan = await Pengaturan.findById("singleton").lean();
  const template = normalizeSyarat(pengaturan?.syaratKetentuan);
  const filter = { status: { $in: ["unpaid", "paid"] as ("unpaid" | "paid")[] }, syaratKetentuan: { $exists: false } };
  const count = await Invoice.countDocuments(filter);

  console.log(`Template saat ini: ${template ? `${template.split("\n").length} poin` : "(kosong)"}`);
  console.log(`Invoice non-draft tanpa S&K sendiri: ${count}`);

  if (!apply) {
    console.log("Dry run — tidak ada yang ditulis. Jalankan dengan --apply untuk menyimpan.");
    return;
  }
  const res = await Invoice.updateMany(filter, { $set: { syaratKetentuan: template } });
  console.log(`Selesai — ${res.modifiedCount} invoice dibekukan dengan teks template saat ini.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
