import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const OFFICE_EXPENSE_KATEGORI = ["listrik", "internet", "pulsa", "lainnya"] as const;
export const OFFICE_EXPENSE_STATUSES = ["diajukan", "disetujui", "ditolak", "dibayar", "selesai"] as const;

/**
 * "Job Order" (renamed from "Kebutuhan Kantor" 2026-08-23) — office
 * operational expense requests (listrik, wifi, pulsa, dan sejenisnya), NOT
 * resale merchandise — that's Request Produk PO / "Material Order"'s job
 * (models/PurchaseRequest.ts, models/PurchaseBill.ts, models/Supplier.ts).
 * Deliberately a separate, simpler flow with no Supplier/bank-account
 * relationship: request -> Admin approve/reject -> bukti transfer
 * (uang sudah dikirim) -> bukti pembelian berhasil (mis. token listrik
 * masuk, wifi aktif). Confirmed with the user 2026-08-23.
 *
 * status flow: diajukan -> disetujui|ditolak -> (if disetujui) dibayar ->
 * selesai. Marking "dibayar" posts a normal Operasional cashflow +
 * journal entry (account 6300, same as the existing manual
 * expense form) via lib/services/recordCashflow.ts.
 */
const OfficeExpenseRequestSchema = new Schema(
  {
    nomor: { type: String, required: true, unique: true }, // JO-0001
    nama: { type: String, required: true, trim: true }, // e.g. "Bayar tagihan listrik Agustus"
    kategori: { type: String, enum: OFFICE_EXPENSE_KATEGORI, required: true },
    jumlah: { type: Number, required: true, min: 0 }, // requested amount
    alasan: { type: String, trim: true },
    diajukanOleh: { type: String },

    status: { type: String, enum: OFFICE_EXPENSE_STATUSES, required: true, default: "diajukan" },

    disetujuiOleh: { type: String },
    disetujuiTanggal: { type: Date },
    alasanTolak: { type: String, trim: true },

    buktiTransferUrl: { type: String },
    buktiTransferTanggal: { type: Date },
    buktiTransferNominal: { type: Number }, // actual amount sent — can differ slightly from `jumlah`
    buktiTransferOleh: { type: String },

    buktiBerhasilUrl: { type: String },
    buktiBerhasilCatatan: { type: String, trim: true },
    buktiBerhasilTanggal: { type: Date },
    buktiBerhasilOleh: { type: String },
  },
  { timestamps: true }
);

export type OfficeExpenseRequestDoc = InferSchemaType<typeof OfficeExpenseRequestSchema>;

export const OfficeExpenseRequest: Model<OfficeExpenseRequestDoc> =
  models.OfficeExpenseRequest || model<OfficeExpenseRequestDoc>("OfficeExpenseRequest", OfficeExpenseRequestSchema);
