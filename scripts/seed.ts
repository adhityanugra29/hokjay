/**
 * Seeds MongoDB Atlas with realistic sample data mirroring the original
 * preview-ui mockup, going through the same lib/services/* functions the
 * app uses at runtime so stock, commission, and cashflow stay consistent.
 *
 * Usage: npm run seed   (reads MONGODB_URI from .env.local)
 */
import { config } from "dotenv";
import path from "node:path";
config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import { Sales } from "../models/Sales";
import { Product } from "../models/Product";
import { Customer } from "../models/Customer";
import { Invoice } from "../models/Invoice";
import { StockMovement } from "../models/StockMovement";
import { CashflowEntry } from "../models/CashflowEntry";
import { Counter } from "../models/Counter";
import { Category } from "../models/Category";
import { Courier } from "../models/Courier";
import { PaymentMethod } from "../models/PaymentMethod";
import { JournalEntry } from "../models/JournalEntry";
import { nextCustomerCode, nextProductSku } from "../lib/counters";
import { createInvoice } from "../lib/services/createInvoice";
import { payInvoice } from "../lib/services/payInvoice";
import { restockProduct } from "../lib/services/restockProduct";
import { recordCashflow } from "../lib/services/recordCashflow";

const CATEGORY_NAMES = [
  "Working Table",
  "Sink",
  "Rack",
  "Cabinet",
  "Stove",
  "Kwali Range",
  "Fryer",
  "Undercounter Chiller",
  "Undercounter Freezer",
  "Upright Chiller",
  "Upright Freezer",
  "Chest Box",
  "Showcase",
  "Ice Maker",
  "Peralatan baking",
];

interface ProductSeed {
  name: string;
  category: string;
  hargaBeli: number;
  hargaRekomendasi: number;
  hargaMinimum: number;
  komisiPercent: number;
  stok: number;
  kondisi?: "baru" | "bekas";
  kondisiPercent?: number;
  dimensi?: { panjangCm: number; lebarCm: number; tinggiCm: number };
  ketebalan?: string;
  deskripsi: string;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI belum diisi. Salin .env.local.example ke .env.local lalu isi connection string Atlas kamu.");
    process.exit(1);
  }

  console.log("Menyambung ke MongoDB...");
  await mongoose.connect(uri);

  console.log("Menghapus data lama...");
  await Promise.all([
    Sales.deleteMany({}),
    Product.deleteMany({}),
    Customer.deleteMany({}),
    Invoice.deleteMany({}),
    StockMovement.deleteMany({}),
    CashflowEntry.deleteMany({}),
    Counter.deleteMany({}),
    Category.deleteMany({}),
    Courier.deleteMany({}),
    PaymentMethod.deleteMany({}),
    JournalEntry.deleteMany({}),
  ]);

  console.log("Membuat kategori produk...");
  await Category.insertMany(CATEGORY_NAMES.map((name) => ({ name })));

  console.log("Membuat kurir...");
  const courierDocs = await Courier.insertMany([
    { name: "Kurir Internal" },
    { name: "JNE Trucking" },
    { name: "Sewa Truk / Pihak Ketiga" },
    { name: "Diambil Sendiri oleh Pelanggan" },
  ]);
  const courierByName = new Map(courierDocs.map((c) => [c.name, c]));

  console.log("Membuat metode pembayaran...");
  await PaymentMethod.insertMany([
    { name: "Transfer Bank" },
    { name: "QRIS" },
    { name: "E-Wallet (OVO/GoPay/Dana)" },
    { name: "Tunai" },
  ]);

  console.log("Membuat sales...");
  const salesNames = ["Feby", "Anjas", "Avi", "Syifa"];
  const salesDocs = await Sales.insertMany(salesNames.map((nama) => ({ nama, aktif: true })));
  const salesByName = new Map(salesDocs.map((s) => [s.nama, s]));

  console.log("Membuat produk...");
  const productSeed: ProductSeed[] = [
    {
      name: "Meja Kerja Stainless Steel 120cm",
      category: "Working Table",
      hargaBeli: 2_600_000,
      hargaRekomendasi: 3_500_000,
      hargaMinimum: 3_200_000,
      komisiPercent: 5,
      stok: 32,
      dimensi: { panjangCm: 120, lebarCm: 60, tinggiCm: 85 },
      ketebalan: "1.2 mm",
      deskripsi: "Meja kerja stainless steel kokoh untuk dapur komersial.",
    },
    {
      name: "Kompor Gas Industrial 2 Tungku",
      category: "Stove",
      hargaBeli: 6_900_000,
      hargaRekomendasi: 8_750_000,
      hargaMinimum: 8_200_000,
      komisiPercent: 4,
      stok: 6,
      dimensi: { panjangCm: 80, lebarCm: 70, tinggiCm: 90 },
      deskripsi: "Kompor gas 2 tungku untuk kebutuhan dapur skala besar.",
    },
    {
      name: "Kulkas Chiller Showcase 2 Pintu",
      category: "Showcase",
      hargaBeli: 9_800_000,
      hargaRekomendasi: 12_500_000,
      hargaMinimum: 11_800_000,
      komisiPercent: 3,
      stok: 2,
      dimensi: { panjangCm: 120, lebarCm: 65, tinggiCm: 200 },
      deskripsi: "Kulkas showcase 2 pintu untuk display minuman & bahan segar.",
    },
    {
      name: "Rak Stainless Steel 4 Susun",
      category: "Rack",
      hargaBeli: 1_250_000,
      hargaRekomendasi: 1_850_000,
      hargaMinimum: 1_650_000,
      komisiPercent: 6,
      stok: 18,
      dimensi: { panjangCm: 90, lebarCm: 45, tinggiCm: 180 },
      deskripsi: "Rak penyimpanan stainless 4 susun, tahan karat.",
    },
    {
      name: "Ice Maker Hoshizaki",
      category: "Ice Maker",
      hargaBeli: 7_600_000,
      hargaRekomendasi: 9_500_000,
      hargaMinimum: 8_800_000,
      komisiPercent: 4,
      stok: 4,
      kondisi: "bekas" as const,
      kondisiPercent: 85,
      dimensi: { panjangCm: 60, lebarCm: 60, tinggiCm: 80 },
      deskripsi: "Mesin es batu kapasitas besar, kondisi terawat.",
    },
    {
      name: "Oven Range Azalea 5 Tungku",
      category: "Kwali Range",
      hargaBeli: 5_800_000,
      hargaRekomendasi: 7_200_000,
      hargaMinimum: 6_700_000,
      komisiPercent: 4,
      stok: 3,
      kondisi: "bekas" as const,
      kondisiPercent: 80,
      dimensi: { panjangCm: 150, lebarCm: 80, tinggiCm: 95 },
      deskripsi: "Oven range 5 tungku, cocok untuk restoran & katering.",
    },
    {
      name: "Freezer Upright Stainless 3 Pintu",
      category: "Upright Freezer",
      hargaBeli: 12_400_000,
      hargaRekomendasi: 15_500_000,
      hargaMinimum: 14_500_000,
      komisiPercent: 3,
      stok: 2,
      kondisi: "bekas" as const,
      kondisiPercent: 88,
      dimensi: { panjangCm: 160, lebarCm: 75, tinggiCm: 205 },
      deskripsi: "Freezer upright 3 pintu, kapasitas besar.",
    },
    {
      name: "Blender Komersial 2L",
      category: "Peralatan baking",
      hargaBeli: 1_500_000,
      hargaRekomendasi: 2_100_000,
      hargaMinimum: 1_900_000,
      komisiPercent: 4.5,
      stok: 24,
      deskripsi: "Blender komersial kapasitas 2L untuk kebutuhan dapur cepat saji.",
    },
  ];

  const products = [];
  for (const p of productSeed) {
    const sku = await nextProductSku(p.name);
    products.push(await Product.create({ ...p, sku }));
  }
  const productByName = new Map(products.map((p) => [p.name, p]));

  console.log("Membuat pelanggan...");
  const customerSeed = [
    {
      nama: "Ibu Sari",
      namaToko: "Toko Kelontong Sari",
      jenisUsaha: "Toko Kelontong / Ritel",
      whatsapp: "0812-3456-7891",
      alamat: "Jl. Melati Raya No. 8, Jakarta Selatan",
    },
    {
      nama: "Pak Budi",
      namaToko: "Warung Makan Budi",
      jenisUsaha: "Restoran",
      whatsapp: "0821-8877-7031",
      alamat: "Jl. Merpati No. 12, Bandung",
    },
    {
      nama: "CV Makmur Jaya",
      namaToko: "CV Makmur Jaya",
      jenisUsaha: "Katering",
      whatsapp: "022-4567890",
      alamat: "Jl. Industri Kav. 22, Tangerang",
    },
    {
      nama: "Dinda Pratiwi",
      namaToko: "Dinda Cafe & Bakery",
      jenisUsaha: "Cafe",
      whatsapp: "0857-1234-5678",
      alamat: "Jl. Anggrek No. 5, Jakarta Timur",
    },
  ];
  const customers = [];
  for (const c of customerSeed) {
    const kode = await nextCustomerCode();
    customers.push(await Customer.create({ ...c, kode }));
  }
  const [ibuSari, pakBudi, cvMakmur, dinda] = customers;

  console.log("Membuat invoice...");
  const meja = productByName.get("Meja Kerja Stainless Steel 120cm")!;
  const kompor = productByName.get("Kompor Gas Industrial 2 Tungku")!;
  const rak = productByName.get("Rak Stainless Steel 4 Susun")!;
  const blender = productByName.get("Blender Komersial 2L")!;
  const kulkas = productByName.get("Kulkas Chiller Showcase 2 Pintu")!;

  const kurirInternal = courierByName.get("Kurir Internal")!;
  const ambilSendiriKurir = courierByName.get("Diambil Sendiri oleh Pelanggan")!;
  const ongkosDalamKota = 150_000;
  const ongkosAmbilSendiri = 0;

  // INV: draft, not finalized (no stock/commission side effects yet)
  await createInvoice({
    customerNama: "—",
    salesId: String(salesByName.get("Feby")!._id),
    salesNama: "Feby",
    status: "draft",
    items: [{ productId: String(meja._id), qty: 2, hargaJual: meja.hargaRekomendasi }],
  });

  // INV: finalized, unpaid
  await createInvoice({
    customerId: String(dinda._id),
    customerNama: dinda.nama,
    customerWhatsapp: dinda.whatsapp,
    shipAddress: dinda.alamat,
    salesId: String(salesByName.get("Avi")!._id),
    salesNama: "Avi",
    kurir: kurirInternal.name,
    ongkosKirim: ongkosDalamKota,
    tanggalKirim: new Date(),
    status: "unpaid",
    items: [{ productId: String(blender._id), qty: 1, hargaJual: blender.hargaRekomendasi }],
  });

  // INV: finalized then paid — Pak Budi, Anjas
  const invBudi = await createInvoice({
    customerId: String(pakBudi._id),
    customerNama: pakBudi.nama,
    customerWhatsapp: pakBudi.whatsapp,
    shipAddress: pakBudi.alamat,
    salesId: String(salesByName.get("Anjas")!._id),
    salesNama: "Anjas",
    kurir: kurirInternal.name,
    ongkosKirim: ongkosDalamKota,
    tanggalKirim: new Date(),
    status: "unpaid",
    items: [
      { productId: String(rak._id), qty: 2, hargaJual: rak.hargaRekomendasi },
      { productId: String(blender._id), qty: 3, hargaJual: 2_900_000, diskonPerUnit: 50_000 },
    ],
  });
  await payInvoice(String(invBudi._id), { metode: "Transfer Bank", nominalDiterima: invBudi.grandTotal });

  // INV: finalized then paid — CV Makmur Jaya, Feby
  const invMakmur = await createInvoice({
    customerId: String(cvMakmur._id),
    customerNama: cvMakmur.nama,
    customerWhatsapp: cvMakmur.whatsapp,
    shipAddress: cvMakmur.alamat,
    salesId: String(salesByName.get("Feby")!._id),
    salesNama: "Feby",
    kurir: kurirInternal.name,
    ongkosKirim: ongkosDalamKota,
    tanggalKirim: new Date(),
    status: "unpaid",
    items: [{ productId: String(kompor._id), qty: 5, hargaJual: kompor.hargaRekomendasi }],
  });
  await payInvoice(String(invMakmur._id), { metode: "QRIS", nominalDiterima: invMakmur.grandTotal });

  // INV: finalized then paid — Ibu Sari, Feby
  const invSari = await createInvoice({
    customerId: String(ibuSari._id),
    customerNama: ibuSari.nama,
    customerWhatsapp: ibuSari.whatsapp,
    shipAddress: ibuSari.alamat,
    salesId: String(salesByName.get("Feby")!._id),
    salesNama: "Feby",
    kurir: ambilSendiriKurir.name,
    ongkosKirim: ongkosAmbilSendiri,
    tanggalKirim: new Date(),
    status: "unpaid",
    items: [{ productId: String(meja._id), qty: 15, hargaJual: meja.hargaRekomendasi }],
  });
  await payInvoice(String(invSari._id), { metode: "Tunai", nominalDiterima: invSari.grandTotal });
  // mark this one's commission as already cashed out
  invSari.komisiCair = true;
  invSari.komisiCairTanggal = new Date();
  await invSari.save();

  console.log("Mencatat restock & pengeluaran manual...");
  await restockProduct(String(kompor._id), 50, "Restock rutin dari supplier");
  await restockProduct(String(rak._id), 20, "Restock rutin dari supplier");
  await recordCashflow({
    tipe: "keluar",
    keterangan: "Pembelian stok — Kompor Gas Industrial",
    kategori: "Pembelian Stok",
    akunKode: "1300",
    referensi: "PO-0042",
    nominal: kompor.hargaBeli * 6,
  });
  await recordCashflow({
    tipe: "keluar",
    keterangan: "Biaya operasional gudang bulan ini",
    kategori: "Operasional",
    akunKode: "6300",
    nominal: 900_000,
  });

  console.log("Selesai. Produk:", products.length, "| Pelanggan:", customers.length, "| Kulkas stok:", kulkas.stok);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
