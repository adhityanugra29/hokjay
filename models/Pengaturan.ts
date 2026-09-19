import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Draft starting content for syaratKetentuan — generic terms for a kitchen
// equipment business, explicitly marked as a draft the Owner should review
// before it reaches a real customer. Per the user's request 2026-09-19
// ("Pakai draft standar dulu, saya edit nanti"). One point per line — the
// Invoice PDF (InvoicePrintDoc.tsx/InvoiceDocument.tsx) renders each
// non-empty line as its own numbered item.
export const DEFAULT_SYARAT_KETENTUAN = [
  "Harga yang tertera sudah termasuk PPN dan berlaku sesuai tanggal invoice ini diterbitkan.",
  "Pembayaran dianggap sah setelah dana diterima penuh di rekening resmi CV. Horeca Jaya Abadi.",
  "Barang yang sudah dibeli tidak dapat dikembalikan atau ditukar kecuali ada kesepakatan tertulis sebelumnya.",
  "Estimasi waktu pengiriman menyesuaikan ketersediaan stok dan lokasi pengiriman, akan dikonfirmasi terpisah oleh sales.",
  "Garansi produk mengikuti ketentuan dari masing-masing produsen/merek, dihitung sejak tanggal barang diterima.",
].join("\n");

/**
 * Singleton settings document (always exactly one row, upserted by _id).
 * Started as just the opening cash balance — see app/admin/keuangan and
 * lib/services/journal.ts's postKasAwal(), which posts/reconciles the
 * matching journal entry whenever this changes.
 *
 * `syaratKetentuan` (2026-09-19) — free text shown on every Invoice PDF/
 * preview, editable by Owner/Admin from Pengaturan without needing a code
 * change each time. Per the user's request ("saran saya ditambahkan ke
 * pengaturan saja").
 */
const PengaturanSchema = new Schema(
  {
    _id: { type: String, default: "singleton" },
    kasAwal: { type: Number, default: 0 },
    kasAwalTanggal: { type: Date, default: Date.now },
    syaratKetentuan: { type: String, default: DEFAULT_SYARAT_KETENTUAN },
  },
  { timestamps: true }
);

export type PengaturanDoc = InferSchemaType<typeof PengaturanSchema>;

export const Pengaturan: Model<PengaturanDoc> =
  models.Pengaturan || model<PengaturanDoc>("Pengaturan", PengaturanSchema);
