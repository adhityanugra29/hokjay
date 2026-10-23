/**
 * Mengkapitalkan (UPPERCASE) data master lama supaya seragam dengan input
 * auto-kapital di form. Tidak menyentuh transaksi/snapshot (Invoice,
 * StockMovement, PO, Tagihan, Cashflow, dll.) — dokumen yang sudah dibuat
 * tetap seperti saat dicetak.
 *
 * SENGAJA TIDAK DIUBAH (dicocokkan persis / dipakai logika):
 *   User.nama, Sales.nama, Karyawan.nama, Customer.assignedSales (kunci
 *   pencocokan sales), PaymentMethod.name ("Tunai" menentukan akun kas),
 *   Courier.name (Invoice.kurir lama menyimpan nama persis), Customer.kota /
 *   provinsi (nilai dari daftar wilayah), email, S&K, URL, enum.
 *
 * Usage:
 *   npm run kapitalkan-data-lama            # DRY-RUN: hanya melapor, tidak menulis
 *   npm run kapitalkan-data-lama -- --apply # menulis ke database
 * Membaca MONGODB_URI dari .env.local. Aman dijalankan ulang (idempoten).
 * Backup database dulu sebelum --apply.
 */
import { config } from "dotenv";
import path from "node:path";
config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import { dbConnect } from "../lib/db";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { Jasa } from "../models/Jasa";
import { Supplier } from "../models/Supplier";
import { Customer } from "../models/Customer";
import { OfficeAsset } from "../models/OfficeAsset";
import { Sales } from "../models/Sales";
import { Karyawan } from "../models/Karyawan";

const APPLY = process.argv.includes("--apply");

type Doc = Record<string, unknown> & { _id: unknown };

interface Target {
  label: string;
  model: { collection: mongoose.Collection };
  fields: string[];
}

// Tanpa Product.name/category dan Category.name — ditangani terpisah di bawah.
const TARGETS: Target[] = [
  { label: "Product", model: Product, fields: ["name", "merk", "deskripsi"] },
  { label: "Jasa", model: Jasa, fields: ["nama"] },
  { label: "Supplier", model: Supplier, fields: ["namaUsaha", "alamat", "bank", "nomorRekening", "kontak", "catatan"] },
  { label: "Customer", model: Customer, fields: ["nama", "namaToko", "jenisUsaha", "alamat", "catatan"] },
  { label: "OfficeAsset", model: OfficeAsset, fields: ["nama", "satuan", "pemegang", "lokasi", "catatan"] },
  { label: "Sales", model: Sales, fields: ["bank"] },
  { label: "Karyawan", model: Karyawan, fields: ["jabatan"] },
];

const up = (v: unknown): string | null => (typeof v === "string" && v !== v.toUpperCase() ? v.toUpperCase() : null);

async function main() {
  await dbConnect();
  console.log(`Database: ${mongoose.connection.name}  |  mode: ${APPLY ? "APPLY (menulis!)" : "DRY-RUN (tidak menulis)"}\n`);

  // 1) Kategori — nama unik (case-sensitive), jadi cek bentrok dulu.
  const categories = (await Category.collection.find({}).toArray()) as unknown as Doc[];
  const allNames = new Set(categories.map((c) => c.name as string));
  const renames = new Map<string, string>();
  const collisions: string[] = [];
  for (const c of categories) {
    const next = up(c.name);
    if (!next) continue;
    const taken = allNames.has(next) || [...renames.values()].includes(next);
    if (taken) collisions.push(`${c.name} → ${next} (sudah ada kategori bernama ${next})`);
    else renames.set(c.name as string, next);
  }
  console.log(`Category: ${renames.size} berubah, ${collisions.length} bentrok (dilewati)`);
  for (const [a, b] of [...renames].slice(0, 10)) console.log(`  ${a} → ${b}`);
  for (const c of collisions) console.log(`  BENTROK: ${c}`);

  // 2) Produk — name/merk/deskripsi + category (mengikuti rename kategori).
  const products = (await Product.collection.find({}).toArray()) as unknown as Doc[];
  const productOps: mongoose.AnyBulkWriteOperation[] = [];
  const sample: string[] = [];
  for (const p of products) {
    const set: Record<string, string> = {};
    for (const f of ["name", "merk", "deskripsi"]) {
      const n = up(p[f]);
      if (n) set[f] = n;
    }
    const newCat = renames.get(p.category as string);
    if (newCat) set.category = newCat;
    if (Object.keys(set).length) {
      productOps.push({ updateOne: { filter: { _id: p._id as never }, update: { $set: set } } });
      if (sample.length < 10 && set.name) sample.push(`${p.name} → ${set.name}`);
    }
  }
  console.log(`\nProduct (name/merk/deskripsi/category): ${productOps.length} dokumen berubah`);
  sample.forEach((s) => console.log(`  ${s}`));

  // 3) Koleksi master lain.
  const otherOps = new Map<Target, mongoose.AnyBulkWriteOperation[]>();
  for (const t of TARGETS.filter((x) => x.label !== "Product")) {
    const docs = (await t.model.collection.find({}).toArray()) as unknown as Doc[];
    const ops: mongoose.AnyBulkWriteOperation[] = [];
    for (const d of docs) {
      const set: Record<string, string> = {};
      for (const f of t.fields) {
        const n = up(d[f]);
        if (n) set[f] = n;
      }
      if (Object.keys(set).length) ops.push({ updateOne: { filter: { _id: d._id as never }, update: { $set: set } } });
    }
    otherOps.set(t, ops);
    console.log(`${t.label} (${t.fields.join(", ")}): ${ops.length} dokumen berubah`);
  }

  if (!APPLY) {
    console.log("\nDRY-RUN selesai — tidak ada yang ditulis. Jalankan ulang dengan --apply untuk menerapkan.");
    return;
  }

  // Kategori dulu, lalu produk (yang category-nya mengikuti), lalu sisanya.
  // collection.bulkWrite (native) → updatedAt tidak ikut berubah.
  if (renames.size) {
    await Category.collection.bulkWrite(
      [...renames].map(([a, b]) => ({ updateOne: { filter: { name: a }, update: { $set: { name: b } } } }))
    );
  }
  if (productOps.length) await Product.collection.bulkWrite(productOps as never);
  for (const [t, ops] of otherOps) if (ops.length) await t.model.collection.bulkWrite(ops as never);
  console.log("\nSelesai — perubahan sudah ditulis.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
