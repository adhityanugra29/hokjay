import { Counter } from "@/models/Counter";
import { currentJakartaMonthYear } from "@/lib/timezone";

/** Atomically allocates the next number in a named sequence. */
async function nextSeq(name: string): Promise<number> {
  const doc = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return doc!.seq;
}

/** "202608" for August 2026 (Jakarta time) — the counter resets every month, one sequence per YYYYMM. */
function invoiceYearMonth(): string {
  const { year, month } = currentJakartaMonthYear();
  return `${year}${String(month).padStart(2, "0")}`;
}

/**
 * Format: INV-YYYYMM#### (e.g. INV-2026080001) — resets to 0001 each month,
 * confirmed with the user 2026-08-22. Invoices created before this change
 * keep their old INV-#### numbers; only new ones use this format.
 */
export async function nextInvoiceNumber(): Promise<string> {
  const yyyymm = invoiceYearMonth();
  const seq = await nextSeq(`invoice:${yyyymm}`);
  return `INV-${yyyymm}${String(seq).padStart(4, "0")}`;
}

/**
 * Read-only preview of what the next invoice number will be, for display in
 * the "Buat Invoice Baru" form. Doesn't increment the counter — the real
 * number is only allocated by nextInvoiceNumber() when the invoice is
 * actually saved, so under concurrent creation this preview can occasionally
 * be off by one.
 */
export async function peekNextInvoiceNumber(): Promise<string> {
  const yyyymm = invoiceYearMonth();
  const doc = await Counter.findById(`invoice:${yyyymm}`);
  const seq = (doc?.seq ?? 0) + 1;
  return `INV-${yyyymm}${String(seq).padStart(4, "0")}`;
}

export async function nextCustomerCode(): Promise<string> {
  const seq = await nextSeq("customer");
  return `CUST-${String(seq).padStart(4, "0")}`;
}

export async function nextPurchaseRequestCode(): Promise<string> {
  const seq = await nextSeq("purchase-request");
  return `PR-${String(seq).padStart(4, "0")}`;
}

/** "Material Order" (formerly "Tagihan Pembelian") — renamed 2026-08-23; old records keep their PB- numbers. */
export async function nextPurchaseBillCode(): Promise<string> {
  const seq = await nextSeq("material-order");
  return `MO-${String(seq).padStart(4, "0")}`;
}

/** "Job Order" (formerly "Kebutuhan Kantor") — office operational expense requests. */
export async function nextJobOrderCode(): Promise<string> {
  const seq = await nextSeq("job-order");
  return `JO-${String(seq).padStart(4, "0")}`;
}

/** Purchasing's restocking PO — design "6a", see models/PurchaseOrder.ts. Resets monthly like INV-. */
export async function nextPurchaseOrderCode(): Promise<string> {
  const yyyymm = invoiceYearMonth();
  const seq = await nextSeq(`purchase-order:${yyyymm}`);
  return `PO-${yyyymm}${String(seq).padStart(4, "0")}`;
}

/** Inventaris Kantor asset tag — design "6c", see models/OfficeAsset.ts. Never resets. */
export async function nextAssetCode(): Promise<string> {
  const seq = await nextSeq("office-asset");
  return `AST-${String(seq).padStart(3, "0")}`;
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
