import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

const InvoiceItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    isCustom: { type: Boolean, default: false },
    namaSnapshot: { type: String, required: true },
    qty: { type: Number, required: true },
    hargaJual: { type: Number, required: true },
    hargaMinimumSnapshot: { type: Number, required: true },
    diskonPerUnit: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
    komisiPerItemSnapshot: { type: Number, required: true },
    komisiSubtotal: { type: Number, required: true },
  },
  { _id: false }
);

const RiwayatEntrySchema = new Schema(
  {
    tanggal: { type: Date, default: Date.now },
    keterangan: { type: String, required: true },
  },
  { _id: false }
);

const InvoiceSchema = new Schema(
  {
    nomor: { type: String, required: true, unique: true },

    customer: {
      ref: { type: Schema.Types.ObjectId, ref: "Customer" },
      nama: { type: String, required: true },
      whatsapp: { type: String },
    },
    shipAddress: { type: String },

    sales: {
      ref: { type: Schema.Types.ObjectId, ref: "Sales" },
      nama: { type: String, required: true },
    },

    tanggalInvoice: { type: Date, default: Date.now },
    tanggalKirim: { type: Date },
    kurir: { type: String },
    ongkosKirim: { type: Number, default: 0 },

    items: { type: [InvoiceItemSchema], default: [] },

    subtotalProduk: { type: Number, required: true, default: 0 },
    grandTotal: { type: Number, required: true, default: 0 },

    status: { type: String, enum: ["draft", "unpaid", "paid"], default: "draft" },

    payment: {
      metode: { type: String },
      nominalDiterima: { type: Number },
      buktiUrl: { type: String },
      tanggalBayar: { type: Date },
      noResi: { type: String },
      catatan: { type: String },
    },

    komisiCair: { type: Boolean, default: false },
    komisiCairTanggal: { type: Date },

    riwayat: { type: [RiwayatEntrySchema], default: [] },
  },
  { timestamps: true }
);

export type InvoiceDoc = InferSchemaType<typeof InvoiceSchema> & { _id: Types.ObjectId };

export const Invoice: Model<InvoiceDoc> =
  models.Invoice || model<InvoiceDoc>("Invoice", InvoiceSchema);
