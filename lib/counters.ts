import { Counter } from "@/models/Counter";

/** Atomically allocates the next number in a named sequence. */
async function nextSeq(name: string): Promise<number> {
  const doc = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return doc!.seq;
}

export async function nextInvoiceNumber(): Promise<string> {
  const seq = await nextSeq("invoice");
  return `INV-${String(seq).padStart(4, "0")}`;
}

/**
 * Read-only preview of what the next invoice number will be, for display in
 * the "Buat Invoice Baru" form. Doesn't increment the counter — the real
 * number is only allocated by nextInvoiceNumber() when the invoice is
 * actually saved, so under concurrent creation this preview can occasionally
 * be off by one.
 */
export async function peekNextInvoiceNumber(): Promise<string> {
  const doc = await Counter.findById("invoice");
  const seq = (doc?.seq ?? 0) + 1;
  return `INV-${String(seq).padStart(4, "0")}`;
}

export async function nextCustomerCode(): Promise<string> {
  const seq = await nextSeq("customer");
  return `CUST-${String(seq).padStart(4, "0")}`;
}

/** Derives a short SKU prefix from a product name's initials, e.g. "Blender Komersial 2L" -> "BK". */
export async function nextProductSku(name: string): Promise<string> {
  const letters = name
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z]/g, "")[0])
    .filter(Boolean)
    .join("")
    .toUpperCase();
  const prefix = (letters || "PRD").slice(0, 4).padEnd(2, "X");
  const seq = await nextSeq(`sku:${prefix}`);
  return `${prefix}-${String(seq).padStart(2, "0")}`;
}
