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
 * An unpaid invoice already decremented stock and posted a finalization
 * journal entry (see createInvoice/updateInvoice) — both are reversed here,
 * mirroring updateInvoice's own reversal block, so deleting never leaves
 * stock short or the books double-counted. A draft never had those side
 * effects, so it's just removed directly.
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

  if (invoice.status === "unpaid") {
    for (const item of invoice.items) {
      if (!item.product) continue;
      await Product.updateOne({ _id: item.product }, { $inc: { stok: item.qty } });
    }
    await StockMovement.deleteMany({ invoice: invoice._id });
    await JournalEntry.deleteMany({ invoice: invoice._id });
  }

  await Invoice.deleteOne({ _id: invoice._id });
}
