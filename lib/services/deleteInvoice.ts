import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { Invoice } from "@/models/Invoice";
import { StockMovement } from "@/models/StockMovement";
import { JournalEntry } from "@/models/JournalEntry";

/**
 * Deletes a draft or unpaid invoice — per the user's request 2026-08-25
 * ("bisa di hapus, jika belum lunas, tapi kasih warning"). Paid invoices
 * can never be deleted (money and commission have already changed hands —
 * same "final" rule as updateInvoice's edit guard).
 *
 * Since 2026-08-27, a new-style unpaid invoice (Booked/Sudah DP) never
 * touched stock or posted a journal to begin with, so deleting one is just
 * a plain removal. The one exception: an invoice already finalized under
 * the pre-2026-08-27 rule (detected via its "invoice-finalisasi" journal
 * entry) DID decrement stock and post a journal at "unpaid" time — both
 * are reversed here first, same as updateInvoice's own legacy reversal.
 *
 * An invoice that already received a DP has real cash tied to it (a
 * CashflowEntry + JournalEntry posted immediately on receipt, per
 * receiveDp.ts) — deleting the invoice would orphan that money trail, so
 * this refuses rather than silently losing track of received cash.
 */
export async function deleteInvoice(invoiceId: string) {
  await dbConnect();

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error("Invoice tidak ditemukan");
  if (invoice.status === "paid") throw new Error("Invoice yang sudah lunas tidak bisa dihapus");
  if (invoice.dp?.nominal) {
    throw new Error("Invoice ini sudah menerima DP — tidak bisa dihapus karena uangnya sudah tercatat masuk");
  }

  const legacyFinalized = await JournalEntry.exists({ invoice: invoice._id, sumberTipe: "invoice-finalisasi" });
  if (legacyFinalized) {
    for (const item of invoice.items) {
      if (!item.product) continue;
      await Product.updateOne({ _id: item.product }, { $inc: { stok: item.qty } });
    }
    await StockMovement.deleteMany({ invoice: invoice._id });
    await JournalEntry.deleteMany({ invoice: invoice._id });
  }

  await Invoice.deleteOne({ _id: invoice._id });
}
